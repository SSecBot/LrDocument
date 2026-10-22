import { z } from 'zod';

export const transactionFormSchema = z
  .object({
    title: z.string().trim().min(1, 'İşlem başlığı zorunludur.'),
    amount: z.number().positive('Tutar sıfırdan büyük olmalıdır.'),
    currency: z.enum(['TRY', 'USD', 'EUR']),
    type: z.enum(['gelir', 'gider']),
    category: z.string().trim().min(1, 'Kategori seçimi zorunludur.'),
    date: z.string().trim().min(1, 'İşlem tarihi zorunludur.'),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z.enum(['gunluk', 'haftalik', 'aylik', 'yillik']).optional(),
    endDate: z.string().optional(),
    priority: z.enum(['yuksek', 'orta', 'dusuk']).default('orta'),
    description: z.string().optional(),
    isConfirmed: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // If an endDate is provided, it must not be earlier than the start date
      if (data.isRecurring && data.endDate && data.endDate.trim().length > 0 && data.date) {
        return data.endDate >= data.date;
      }
      return true;
    },
    {
      message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      path: ['endDate'],
    }
  );

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
