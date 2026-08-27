import * as XLSX from 'xlsx';
import { AdminUserItem } from '@/types';

export function exportUsersToExcel(users: AdminUserItem[], filename: string = 'lrdocument_kullanici_listesi') {
  const formattedData = users.map((u) => {
    let statusText = 'Onay Bekliyor';
    if (u.status === 'APPROVED') statusText = 'Onaylı';
    if (u.status === 'REJECTED') statusText = 'Reddedildi';

    const regDate = new Date(u.createdAt);
    const formattedDate = !isNaN(regDate.getTime())
      ? regDate.toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : u.createdAt;

    return {
      'User Email': u.email,
      'Ad Soyad': u.name,
      'Account Status': statusText,
      'Subscription Type': u.subscriptionPlan || 'Aylık',
      'Role': u.role,
      'Registration Date': formattedDate,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 30 }, // User Email
    { wch: 22 }, // Ad Soyad
    { wch: 18 }, // Account Status
    { wch: 20 }, // Subscription Type
    { wch: 12 }, // Role
    { wch: 22 }, // Registration Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kullanıcılar');

  // Trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportUsersToCSV(users: AdminUserItem[], filename: string = 'lrdocument_kullanici_listesi') {
  const headers = [
    'User Email',
    'Ad Soyad',
    'Account Status',
    'Subscription Type',
    'Role',
    'Registration Date',
  ];
  
  const rows = users.map((u) => {
    let statusText = 'Onay Bekliyor';
    if (u.status === 'APPROVED') statusText = 'Onaylı';
    if (u.status === 'REJECTED') statusText = 'Reddedildi';

    const regDate = new Date(u.createdAt);
    const formattedDate = !isNaN(regDate.getTime())
      ? regDate.toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : u.createdAt;

    return [
      `"${u.email.replace(/"/g, '""')}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${statusText}"`,
      `"${(u.subscriptionPlan || 'Aylık').replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${formattedDate}"`,
    ].join(',');
  });

  // UTF-8 BOM for Excel compatibility with Turkish characters
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
