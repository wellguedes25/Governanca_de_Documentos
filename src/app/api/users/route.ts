import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME, SessionData } from '@/lib/session';
import { createUser, deleteUser, getPublicUsers, updateUser, UserRole } from '@/lib/users';

export const dynamic = 'force-dynamic';

async function requireAdminSession(): Promise<{ session?: SessionData; errorResponse?: NextResponse }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session || !session.userId) {
    return {
      errorResponse: NextResponse.json({ error: 'Sessão não autenticada.' }, { status: 401 }),
    };
  }

  if (session.role !== 'ADMIN') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Acesso restrito a administradores.' },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export async function GET() {
  const auth = await requireAdminSession();
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json({ users: getPublicUsers() });
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const user = createUser({
      username: body.username,
      name: body.name,
      password: body.password,
      role: (body.role === 'ADMIN' ? 'ADMIN' : 'ANALISTA') as UserRole,
      active: body.active !== undefined ? Boolean(body.active) : true,
    });

    return NextResponse.json({ user, users: getPublicUsers() }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao cadastrar usuário.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminSession();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const user = updateUser(String(body.id), {
      name: body.name,
      role: body.role ? (body.role === 'ADMIN' ? 'ADMIN' : 'ANALISTA') : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      password: body.password ? String(body.password) : undefined,
    });

    return NextResponse.json({ user, users: getPublicUsers() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar usuário.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminSession();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Parâmetro id é obrigatório.' }, { status: 400 });
    }

    deleteUser(id, auth.session?.userId);
    return NextResponse.json({ users: getPublicUsers() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao remover usuário.' },
      { status: 400 }
    );
  }
}
