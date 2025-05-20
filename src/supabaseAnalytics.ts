import { supabase } from './supabaseClient';

/**
 * Mencatat event analitik menggunakan Supabase
 * @param eventName Nama event yang dicatat
 * @param eventParams Parameter tambahan untuk event tersebut
 */
export const logAnalyticsEvent = async (eventName: string, eventParams?: Record<string, any>) => {
  try {
    // Jika pengguna login, tambahkan user_id
    const { data: { user } } = await supabase.auth.getUser();
    
    const eventData = {
      event_name: eventName,
      event_params: eventParams || {},
      user_id: user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    // Catat event ke tabel analytics di Supabase
    // Catatan: Anda perlu membuat tabel 'analytics' di Supabase terlebih dahulu
    const { error } = await supabase
      .from('analytics')
      .insert([eventData]);
      
    if (error) {
      console.error('Error logging analytics event:', error);
    }
    
    // Juga log ke console di development untuk debugging
    if (import.meta.env.DEV) {
      console.debug('Analytics event:', { eventName, ...eventParams });
    }
    
  } catch (error) {
    // Jangan biarkan error analitik mengganggu aplikasi utama
    console.error('Error in analytics:', error);
  }
}; 