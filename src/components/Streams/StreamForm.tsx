import React, { useState, useEffect } from 'react';
import { useStream } from '../../contexts/StreamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Stream, ScheduleSlot } from '../../types';
import { X, Plus, Trash2, Clock, Calendar, Video, Settings } from 'lucide-react';
import { VideoSelect } from '../Common/VideoSelect';

// Use a subset of the Stream type for the form data to avoid mismatches
// This makes the form's state compatible with the final Stream object
interface StreamFormData extends Omit<Stream, 'id' | 'userId' | 'createdAt' | 'lastRun' | 'nextRun' | 'videos'> {
  videos: string[]; // Form uses an array of video IDs
}

interface StreamFormProps {
  onClose: () => void;
  streamId?: string | number | null;
}

export const StreamForm: React.FC<StreamFormProps> = ({ onClose, streamId }): React.ReactElement => {
  const { streams, videos, createStream, updateStream } = useStream();
  const { user } = useAuth();

  const getInitialFormData = (): StreamFormData => ({
    title: '',
    description: '',
    rtmpUrl: user?.settings?.defaultRtmpUrl || 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: '',
    videos: [],
    loop: user?.settings?.autoLoop ?? true,
    schedule: {
      type: 'manual',
      schedules: [],
      date: new Date().toISOString().split('T')[0],
    },
    type: 'manual',
    status: 'waiting',
    is_scheduled: false,
    scheduled_start_time: null,
    scheduled_end_time: null,
  });

  const [formData, setFormData] = useState<StreamFormData>(getInitialFormData());
  const [conflicts, setConflicts] = useState<string[]>([]);
  const isEditing = !!streamId;

  useEffect(() => {
    // This effect should only run ONCE when the form is opened for editing.
    // It populates the form with the data of the stream being edited.
    // It should NOT re-run when the 'streams' array changes, to avoid overwriting user input.
    if (isEditing && streamId) {
      const streamToEdit = streams.find(s => s.id === streamId);
      if (streamToEdit) {
        const initialData = getInitialFormData();
        setFormData({
          ...initialData,
          ...streamToEdit,
          videos: streamToEdit.videos.map((v: any) => (typeof v === 'string' ? v : v.id)),
          schedule: {
            ...initialData.schedule,
            ...(streamToEdit.schedule || {}),
            type: streamToEdit.schedule?.type || 'manual',
          },
          type: streamToEdit.type || 'manual',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, streamId]); // Dependencies are intentionally limited to run only on mount.

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + (duration || 0);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  const checkScheduleConflicts = (schedules: ScheduleSlot[]): string[] => {
    const newConflicts: string[] = [];
    if (schedules.length < 2) return [];
    const sortedSlots = [...schedules].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];
      const currentEndTime = calculateEndTime(currentSlot.startTime, currentSlot.duration);
      if (timeToMinutes(currentEndTime) > timeToMinutes(nextSlot.startTime)) {
        newConflicts.push(`Slot ${i + 1} (ends at ${currentEndTime}) overlaps with Slot ${i + 2} (starts at ${nextSlot.startTime})`);
      }
    }
    return newConflicts;
  };

  useEffect(() => {
    if (formData.schedule.type !== 'manual') {
      const conflictMessages = checkScheduleConflicts(formData.schedule.schedules);
      setConflicts(conflictMessages);
    } else {
      setConflicts([]);
    }
  }, [formData.schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // The single source of truth for scheduling is the schedule type
    const scheduleType = formData.schedule.type;
    const isScheduled = scheduleType !== 'manual';

    // Build the final schedule object based on the type
    const finalSchedule = isScheduled
      ? {
          ...formData.schedule,
          schedules: formData.schedule.schedules.map(s => ({
            ...s,
            duration: Number(s.duration) || 0,
          })),
        }
      : getInitialFormData().schedule; // Reset schedule for manual streams

    // Calculate start/end times only if scheduled
    let scheduled_start_time: string | null = null;
    let scheduled_end_time: string | null = null;
    if (isScheduled && finalSchedule.schedules && finalSchedule.schedules.length > 0) {
      const sortedSlots = [...finalSchedule.schedules].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      const firstSlot = sortedSlots[0];
      const datePart = finalSchedule.date || new Date().toISOString().split('T')[0];
      scheduled_start_time = new Date(`${datePart}T${firstSlot.startTime}`).toISOString();

      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const endTimeString = calculateEndTime(lastSlot.startTime, lastSlot.duration);
      scheduled_end_time = new Date(`${datePart}T${endTimeString}`).toISOString();
    }

    const finalStreamData: Omit<Stream, 'id' | 'userId' | 'createdAt' | 'lastRun' | 'nextRun'> = {
      ...formData,
      schedule: finalSchedule,
      is_scheduled: isScheduled,
      // Map the form's detailed schedule type to the application's stream type
      type: isScheduled ? 'scheduled' : 'manual',
      status: isScheduled ? 'scheduled' : 'idle',
      scheduled_start_time,
      scheduled_end_time,
    };

    // Do not send an empty streamKey when editing, backend should preserve it
    if (isEditing && !finalStreamData.streamKey) {
      delete (finalStreamData as Partial<typeof finalStreamData>).streamKey;
    }

    try {
      if (isEditing && streamId) {
        await updateStream(streamId, finalStreamData);
      } else {
        await createStream(finalStreamData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save stream:', error);
    }
  };

  const addScheduleSlot = () => {
    const newSlot: ScheduleSlot = { 
      id: `slot_${Date.now()}`,
      startTime: '12:00',
      duration: 60,
      weekdays: formData.schedule.type === 'weekly' ? [] : undefined
    };
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        schedules: [...(prev.schedule.schedules || []), newSlot]
      }
    }));
  };

  const updateScheduleSlot = (id: string, updates: Partial<ScheduleSlot>) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, schedules: prev.schedule.schedules.map(s => s.id === id ? { ...s, ...updates } : s) } }));
  };

  const removeScheduleSlot = (id: string) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, schedules: prev.schedule.schedules.filter(s => s.id !== id) } }));
  };

  const handleWeekdayToggle = (slotId: string, dayIndex: number) => {
    const schedules = formData.schedule.schedules.map(slot => {
      if (slot.id === slotId) {
        const weekdays = slot.weekdays?.includes(dayIndex) ? slot.weekdays.filter(d => d !== dayIndex) : [...(slot.weekdays || []), dayIndex];
        return { ...slot, weekdays };
      }
      return slot;
    });
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, schedules } }));
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col text-white">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Stream' : 'Create New Stream'}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
          <div className="p-6 space-y-6 flex-grow overflow-y-auto">
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white flex items-center"><Settings className="w-5 h-5 mr-2" /><span>Stream Settings</span></h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stream Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-white" placeholder="My Awesome 24/7 Stream" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">RTMP URL</label>
                  <input type="text" value={formData.rtmpUrl} onChange={(e) => setFormData(prev => ({ ...prev, rtmpUrl: e.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-white" placeholder="rtmp://a.rtmp.youtube.com/live2" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-white h-24 resize-none" placeholder="A brief description of your stream."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stream Key</label>
                <input type="password" id="streamKey" autoComplete="new-password" value={formData.streamKey} onChange={(e) => setFormData(prev => ({ ...prev, streamKey: e.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-white" placeholder={isEditing ? "Leave blank to keep existing key" : "Your secret stream key"} required={!isEditing} />
                {isEditing && <p className="text-xs text-gray-400 mt-2">Leave blank to keep the existing stream key.</p>}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white flex items-center space-x-2"><Video className="w-5 h-5" /><span>Video Playlist</span></h4>
              <VideoSelect videos={videos} selectedVideos={formData.videos} onSelect={(selectedVideos) => setFormData(prev => ({ ...prev, videos: selectedVideos }))} placeholder="Select one or more videos..." />
              <div className="flex items-center">
                <input type="checkbox" id="loop" checked={formData.loop} onChange={(e) => setFormData(prev => ({ ...prev, loop: e.target.checked }))} className="w-4 h-4 text-indigo-600 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-indigo-500" />
                <label htmlFor="loop" className="ml-2 text-sm text-gray-300">Loop playlist</label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center space-x-2"><Calendar className="w-5 h-5" /><span>Scheduling</span></h4>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Type</label>
                <select value={formData.schedule.type} onChange={(e) => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, type: e.target.value as any } }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-white">
                  <option value="manual">Manual Start</option>
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {formData.schedule.type !== 'manual' && (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-4">
                  {formData.schedule.type === 'once' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                      <input type="date" value={formData.schedule.date} onChange={(e) => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, date: e.target.value } }))} className="w-full px-3 py-2 bg-gray-800 border-gray-600 rounded-lg text-white" />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <h5 className="font-semibold">Time Slots</h5>
                    <button type="button" onClick={addScheduleSlot} className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" /><span>Add Slot</span></button>
                  </div>
                  {conflicts.length > 0 && (
                    <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
                      {conflicts.map((c, i) => <p key={i}>{c}</p>)}
                    </div>
                  )}
                  {formData.schedule.schedules.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" /><p className="text-gray-400">No time slots added.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.schedule.schedules.map((slot, index) => (
                        <div key={slot.id} className="bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-white font-medium">Slot {index + 1}</span>
                            <button type="button" onClick={() => removeScheduleSlot(slot.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                              <input type="time" value={slot.startTime} onChange={(e) => updateScheduleSlot(slot.id, { startTime: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border-gray-600 rounded-lg text-white" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Duration (min)</label>
                              <input type="number" value={slot.duration} onChange={(e) => updateScheduleSlot(slot.id, { duration: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-gray-800 border-gray-600 rounded-lg text-white" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                              <input type="time" value={calculateEndTime(slot.startTime, slot.duration)} readOnly className="w-full px-3 py-2 bg-gray-900 border-gray-700 rounded-lg text-gray-400" />
                            </div>
                          </div>
                          {formData.schedule.type === 'weekly' && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-300 mb-2">Days</label>
                              <div className="flex flex-wrap gap-2">
                                {weekdays.map((day, dayIndex) => (
                                  <button key={dayIndex} type="button" onClick={() => handleWeekdayToggle(slot.id, dayIndex)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${slot.weekdays?.includes(dayIndex) ? 'bg-indigo-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`}>{day}</button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-900 border-t border-gray-800 flex justify-end space-x-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-400/50 disabled:cursor-not-allowed" disabled={conflicts.length > 0}>{isEditing ? 'Save Changes' : 'Create Stream'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};