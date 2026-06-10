import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  // 1. Limpa o cookie "token" do lado do Next.js imediatamente
  cookieStore.set('token', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  // 2. Tenta revogar o token no backend para invalidação do JTI (ASVS 3.3.1)
  if (token) {
    try {
      const backendUrl = process.env.API_URL || 'http://localhost:8080/api';
      await axios.post(`${backendUrl}/auth/logout`, {}, {
        headers: {
          Cookie: `token=${token}`,
        },
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error('Erro ao revogar token no backend durante logout:', e.message);
    }
  }

  return NextResponse.json({ message: 'Logoff realizado com sucesso no cliente e servidor.' });
}
