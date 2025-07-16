// Dapatkan timezone browser pengguna
export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch (e) {
    console.warn('Gagal mendeteksi timezone browser, menggunakan WIB (Asia/Jakarta) sebagai fallback');
    return 'Asia/Jakarta';
  }
};

// Format tanggal dengan timezone browser
export const formatWithBrowserTimezone = (
  date: Date | string, 
  formatOptions: Intl.DateTimeFormatOptions = {}
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: getBrowserTimezone()
  };

  const options = { ...defaultOptions, ...formatOptions };

  // Hapus opsi yang berpotensi tidak valid yang mungkin diteruskan dari luar
  if ('timeZoneName' in options) {
    delete options.timeZoneName;
  }
  
  try {
    return new Date(date).toLocaleString('id-ID', options);
  } catch (e) {
    console.error('Error formatting date with timezone:', e);
    return new Date(date).toLocaleString('id-ID', defaultOptions);
  }
};

// Konversi waktu lokal ke UTC
export const localToUTC = (date: Date): Date => {
  return new Date(
    date.getTime() - (date.getTimezoneOffset() * 60000)
  );
};

// Konversi UTC ke waktu lokal
export const utcToLocal = (date: Date): Date => {
  return new Date(
    date.getTime() + (date.getTimezoneOffset() * 60000)
  );
};

// Format durasi dalam menit ke format yang lebih mudah dibaca
export const formatDuration = (minutes: number): string => {
  if (!minutes) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}j ${mins}m`;
  } else if (hours > 0) {
    return `${hours}j`;
  } else {
    return `${mins}m`;
  }
};
