import si from 'systeminformation';
import os from 'os';
import { getActiveStreamsCount } from './streamService';

let previousNetworkData: si.Systeminformation.NetworkStatsData[] | null = null;
let previousTimestamp: number | null = null;

async function getDiskUsage() {
  try {
    const fsSize = await si.fsSize();
    const platform = process.platform;
    let targetDisk;

    console.log('All available disks:', JSON.stringify(fsSize, null, 2));

    if (platform === 'win32') {
      const currentDrive = process.cwd().charAt(0).toUpperCase();
      targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === currentDrive);
      if (!targetDisk) {
        targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === 'C');
      }
    } else {
      targetDisk = fsSize.find(disk => disk.mount === '/');
    }

    if (!targetDisk && fsSize.length > 0) {
      console.log('Could not find primary disk, falling back to the first one.');
      targetDisk = fsSize[0];
    }

    if (!targetDisk) {
      console.error('No disk found.');
      return {
        total: "0 GB", used: "0 GB", free: "0 GB",
        usagePercent: 0, drive: "N/A"
      };
    }

    console.log('Selected disk for stats:', JSON.stringify(targetDisk, null, 2));

    const formatDisk = (bytes: number) => {
        if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(2) + " TB";
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
        return (bytes / 1048576).toFixed(2) + " MB";
    };

    const usagePercent = targetDisk.size > 0 ? 
      Math.round(((targetDisk.size - targetDisk.available) / targetDisk.size) * 100) : 0;

    return {
      total: formatDisk(targetDisk.size),
      used: formatDisk(targetDisk.size - targetDisk.available),
      free: formatDisk(targetDisk.available),
      usagePercent: usagePercent,
      drive: targetDisk.mount || targetDisk.fs || "Unknown"
    };
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return {
      total: "0 GB", used: "0 GB", free: "0 GB",
      usagePercent: 0, drive: "N/A"
    };
  }
}

function calculateNetworkSpeed(networkData: si.Systeminformation.NetworkStatsData[]) {
  const currentTimestamp = Date.now();

  if (!previousNetworkData || !previousTimestamp) {
    previousNetworkData = networkData;
    previousTimestamp = currentTimestamp;
    return { download: 0, upload: 0 };
  }

  const timeDiff = (currentTimestamp - previousTimestamp) / 1000;
  if (timeDiff === 0) return { download: 0, upload: 0 };

  const currentTotal = networkData
    .filter(iface => !iface.iface.toLowerCase().includes('loopback') && !iface.iface.toLowerCase().includes('lo'))
    .reduce((acc, iface) => ({ 
      rx_bytes: acc.rx_bytes + (iface.rx_bytes || 0),
      tx_bytes: acc.tx_bytes + (iface.tx_bytes || 0)
    }), { rx_bytes: 0, tx_bytes: 0 });

  const previousTotal = previousNetworkData
    .filter(iface => !iface.iface.toLowerCase().includes('loopback') && !iface.iface.toLowerCase().includes('lo'))
    .reduce((acc, iface) => ({
      rx_bytes: acc.rx_bytes + (iface.rx_bytes || 0),
      tx_bytes: acc.tx_bytes + (iface.tx_bytes || 0)
    }), { rx_bytes: 0, tx_bytes: 0 });

  const downloadBps = Math.max(0, (currentTotal.rx_bytes - previousTotal.rx_bytes) / timeDiff);
  const uploadBps = Math.max(0, (currentTotal.tx_bytes - previousTotal.tx_bytes) / timeDiff);

  previousNetworkData = networkData;
  previousTimestamp = currentTimestamp;

  return {
    download: (downloadBps * 8) / (1024 * 1024), // Mbps
    upload: (uploadBps * 8) / (1024 * 1024) // Mbps
  };
}

export const getSystemStats = async () => {
  try {
    const [cpuData, memData, networkData, diskData] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      getDiskUsage()
    ]);

    const networkSpeed = calculateNetworkSpeed(networkData);

    return {
      cpu: Math.round(cpuData.currentLoad),
      memory: Math.round((memData.active / memData.total) * 100),
      network: networkSpeed,
      disk: diskData,
      activeStreams: getActiveStreamsCount(),
      platform: os.platform(),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      cpu: 0, memory: 0,
      network: { upload: 0, download: 0 },
      disk: { total: '0 GB', used: '0 GB', free: '0 GB', usagePercent: 0, drive: 'N/A' },
      activeStreams: getActiveStreamsCount(),
      platform: os.platform(),
      timestamp: Date.now()
    };
  }
};
