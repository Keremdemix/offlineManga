// services/notificationService.ts
//
// Kurulum:
//   npm install notifee
//   npx pod-install  (iOS)
//
// AndroidManifest.xml'e (android/app/src/main/AndroidManifest.xml) ekle:
//   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
//
// iOS – Info.plist'e ek gerekmez; izin çalışma zamanında istenir.

import notifee, {
  AndroidImportance,
  AndroidCategory,
  AuthorizationStatus,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID   = 'manga_download';
const CHANNEL_NAME = 'Manga İndirme';

/** Kanal yarat (Android) + kullanıcıdan izin iste (iOS / Android 13+). */
export async function setupNotifications(): Promise<void> {
  // Android kanal
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id:         CHANNEL_ID,
      name:       CHANNEL_NAME,
      importance: AndroidImportance.HIGH,
    });
  }

  // İzin kontrolü / isteği
  const settings = await notifee.requestPermission();
  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    console.warn('[Notification] İzin verilmedi.');
  }
}

/** İndirme tamamlandı bildirimi gönder. */
export async function notifyDownloadDone(
  mangaTitle: string,
  chapterNumber: number | string,
): Promise<void> {
  try {
    await notifee.displayNotification({
      title: '✅ İndirme Tamamlandı',
      body:  `${mangaTitle} — Bölüm ${chapterNumber} başarıyla indirildi.`,
      android: {
        channelId:   CHANNEL_ID,
        importance:  AndroidImportance.HIGH,
        category:    AndroidCategory.MESSAGE,
        smallIcon:   'ic_notification',   // android/app/src/main/res/drawable/ altında olmalı
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });
  } catch (e) {
    console.warn('[Notification] Gönderilemedi:', e);
  }
}

/** Toplu indirme tamamlandı bildirimi. */
export async function notifyBatchDownloadDone(
  mangaTitle: string,
  count: number,
): Promise<void> {
  try {
    await notifee.displayNotification({
      title: '✅ Toplu İndirme Tamamlandı',
      body:  `${mangaTitle} — ${count} bölüm başarıyla indirildi.`,
      android: {
        channelId:   CHANNEL_ID,
        importance:  AndroidImportance.HIGH,
        smallIcon:   'ic_notification',
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });
  } catch (e) {
    console.warn('[Notification] Toplu bildirim gönderilemedi:', e);
  }
}   