import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { BudgetState } from './budget';
import { workbookToBase64, base64ToState, bufferToState } from './excel';
import { dayKey } from './format';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Writes an .xlsx and opens the share sheet (or downloads it on web). */
export async function exportToExcel(state: BudgetState): Promise<void> {
  const filename = `NamiBudget_${dayKey(new Date())}.xlsx`;
  const b64 = workbookToBase64(state);

  if (Platform.OS === 'web') {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory) + filename;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: 'Export Nami Budget', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}

/** Lets the user pick an .xlsx and returns the parsed state, or null if cancelled. Throws on invalid files. */
export async function pickExcel(): Promise<BudgetState | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: [XLSX_MIME, 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (!/\.xlsx?$/i.test(asset.name)) throw new Error('Please choose an Excel (.xlsx) file.');
  if (Platform.OS === 'web') {
    return bufferToState(await (await fetch(asset.uri)).arrayBuffer());
  }
  const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64ToState(b64);
}
