import { CategoryType } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export class CategoryService {
  static async getUserCategories(userId: string) {
    return prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  static async createCategory(userId: string, data: { name: string; icon?: string; type?: CategoryType }) {
    return prisma.category.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon || 'folder',
        type: data.type || CategoryType.EXPENSE,
        isSystem: false,
      },
    });
  }

  static async suggestCategory(userId: string, merchantName: string): Promise<{ categoryId: string; categoryName: string } | null> {
    if (!merchantName || !merchantName.trim()) return null;

    const lower = merchantName.toLowerCase().trim();

    let targetSystemName = '';

    if (/swiggy|zomato|zepto|blinkit|instamart|mcdonald|starbucks|restaurant|food|bakery|diner|grocery|supermarket|cafe|dominos|kfc/.test(lower)) {
      targetSystemName = 'Food & Dining';
    } else if (/uber|ola|rapido|lyft|shell|chevron|fuel|gas|transit|metro|cab|parking|toll|irctc|petrol/.test(lower)) {
      targetSystemName = 'Transportation';
    } else if (/amazon|flipkart|myntra|ajio|meesho|croma|reliance|target|walmart|zara|nike|apple|shopping|store|retail|mall/.test(lower)) {
      targetSystemName = 'Shopping';
    } else if (/netflix|spotify|hotstar|pvr|bookmyshow|youtube|hulu|cinema|movie|steam|playstation|xbox|theatre|concert/.test(lower)) {
      targetSystemName = 'Entertainment';
    } else if (/electric|water|utility|power|jio|airtel|bescom|tata play|broadband|mobile|verizon|at&t|internet|bill/.test(lower)) {
      targetSystemName = 'Bills & Utilities';
    } else if (/pharmacy|apollo|pharmeasy|1mg|practo|hospital|cvs|walgreens|doctor|clinic|medical|health|dental/.test(lower)) {
      targetSystemName = 'Healthcare';
    } else if (/payroll|salary|direct deposit|stipend|wages|bonus|income|infosys|tcs|wipro/.test(lower)) {
      targetSystemName = 'Salary & Income';
    }

    if (!targetSystemName) return null;

    // Resolve system category ID dynamically from PostgreSQL database
    const category = await prisma.category.findFirst({
      where: {
        name: { equals: targetSystemName, mode: 'insensitive' },
        OR: [{ isSystem: true }, { userId }],
      },
    });

    if (!category) return null;

    return {
      categoryId: category.id,
      categoryName: category.name,
    };
  }
}
