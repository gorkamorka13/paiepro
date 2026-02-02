'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function updateUserAction(data: { name: string; password?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Non authentifié' };
  }

  try {
    const updateData: any = { name: data.name };
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}
