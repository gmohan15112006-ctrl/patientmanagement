import ExcelJS from 'exceljs';
import { PatientRecord } from '../types/hospital';

export interface ExportOptions {
  fileName?: string;
  splitByDate?: boolean;
  hospitalName?: string;
}

export async function generatePatientExcel(
  records: PatientRecord[],
  options: ExportOptions = {}
): Promise<Blob> {
  const {
    fileName = `Hospital_Emergency_Patient_Register_${new Date().toISOString().slice(0, 10)}.xlsx`,
    splitByDate = false,
    hospitalName = 'HOSPITAL EMERGENCY & TRAUMA CARE UNIT'
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hospital Patient Data Management System';
  workbook.lastModifiedBy = 'Doctor/Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Columns definition matching the uploaded Excel structure exactly
  const columns = [
    { header: 'S NO', key: 'serialNumber', width: 8 },
    { header: 'IP NO', key: 'ipNumber', width: 14 },
    { header: 'NAME', key: 'patientName', width: 26 },
    { header: 'AGE', key: 'age', width: 8 },
    { header: 'SEX', key: 'sex', width: 8 },
    { header: 'ADMISSION DATE& TIME', key: 'admissionDatetime', width: 25 },
    { header: 'PATIENT RECEIVED TIME', key: 'patientReceivedTime', width: 22 },
    { header: 'BROAD SPECIALITY CATEGORY', key: 'specialtyCategory', width: 24 },
    { header: 'DIAGNOSIS', key: 'diagnosis', width: 26 },
    { header: 'AGE INTERVAL', key: 'ageInterval', width: 14 },
    { header: 'TAEI PILLAR/TAEI NON PILLAR', key: 'taeiCategory', width: 22 },
    { header: 'MEDICOLEGAL CATEGORY', key: 'medicolegalCategory', width: 16 },
    { header: 'TRANSFERRED OUT', key: 'transferredOut', width: 16 },
    { header: 'TRANSFERRED OUT TIME', key: 'transferredOutTime', width: 20 },
    { header: 'EMERGENCY RESPONSE TIME', key: 'emergencyResponseTime', width: 20 },
  ];

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC2E2D6' }, // Hospital soft mint/teal from original Excel sheet
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FF000000' },
  };

  const cellFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    color: { argb: 'FF000000' },
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FF555555' } },
    left: { style: 'thin', color: { argb: 'FF555555' } },
    bottom: { style: 'medium', color: { argb: 'FF555555' } },
    right: { style: 'thin', color: { argb: 'FF555555' } },
  };

  const populateSheet = (sheet: ExcelJS.Worksheet, rows: PatientRecord[]) => {
    sheet.columns = columns;

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.height = 36;
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = headerBorder;
    });

    // Add rows
    rows.forEach((record, index) => {
      const row = sheet.addRow({
        serialNumber: record.serialNumber || index + 1,
        // Force string type representation for IP NO to preserve leading zeroes and avoid exponential scientific notation (like 1E+07)
        ipNumber: String(record.ipNumber || ''),
        patientName: (record.patientName || '').toUpperCase(),
        age: record.age,
        sex: record.sex,
        admissionDatetime: record.admissionDatetime,
        patientReceivedTime: record.patientReceivedTime,
        specialtyCategory: record.specialtyCategory,
        diagnosis: (record.diagnosis || '').toUpperCase(),
        ageInterval: record.ageInterval || '',
        taeiCategory: record.taeiCategory || '',
        medicolegalCategory: record.medicolegalCategory || '',
        transferredOut: record.transferredOut || '',
        transferredOutTime: record.transferredOutTime || '',
        emergencyResponseTime: record.emergencyResponseTime || '',
      });

      row.height = 24;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = cellFont;
        cell.border = thinBorder;

        // Specific alignments
        // col 1: S NO (center)
        // col 2: IP NO (center/text format)
        // col 3: NAME (left)
        // col 4: AGE (center)
        // col 5: SEX (center)
        // col 6: ADMISSION DATE (center)
        // col 7: RECEIVED TIME (center)
        // col 8: BROAD SPECIALITY (center)
        // col 9: DIAGNOSIS (left)
        // col 10-15: (center)
        if (colNumber === 2) {
          // IP NO explicitly stored as text
          cell.numFmt = '@';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 3 || colNumber === 9) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    // Auto-filter on all headers
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  };

  if (splitByDate && records.length > 0) {
    // Group records by admission date (e.g. "AUG 11", "AUG 12" style)
    const groups: { [key: string]: PatientRecord[] } = {};
    records.forEach((rec) => {
      let sheetName = 'ALL';
      try {
        const parts = rec.admissionDatetime ? rec.admissionDatetime.split(' ')[0] : '';
        if (parts) {
          // e.g. 11.08.2026 or 2026-08-11
          const d = new Date(parts.replace(/\./g, '-'));
          if (!isNaN(d.getTime())) {
            const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = d.getDate();
            sheetName = `${month} ${day}`;
          } else {
            sheetName = parts.substring(0, 15);
          }
        }
      } catch {
        sheetName = 'BATCH_1';
      }
      if (!groups[sheetName]) groups[sheetName] = [];
      groups[sheetName].push(rec);
    });

    // Master sheet first
    const masterSheet = workbook.addWorksheet('MASTER_REGISTER');
    populateSheet(masterSheet, records);

    // Then individual date worksheets (matching the screenshot tabs)
    for (const [sheetKey, groupRows] of Object.entries(groups)) {
      // Excel sheet name max 31 chars, no invalid chars
      const safeKey = sheetKey.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
      const sheet = workbook.addWorksheet(safeKey);
      populateSheet(sheet, groupRows);
    }
  } else {
    // Single sheet
    const now = new Date();
    const currentMonthDay = `${now.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${now.getDate()}`;
    const mainSheet = workbook.addWorksheet(records.length > 0 ? currentMonthDay : 'REGISTER');
    populateSheet(mainSheet, records);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 300);
}
