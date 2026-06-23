import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          '계정 삭제 서버 설정이 필요합니다. SUPABASE_SERVICE_ROLE_KEY를 서버 환경 변수로 설정해주세요.',
      },
      { status: 501 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: '로그인 세션을 확인할 수 없습니다.' },
      { status: 401 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: '로그인 세션을 확인할 수 없습니다.' },
      { status: 401 }
    );
  }

  const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
    accessToken,
    'global'
  );

  if (signOutError) {
    return NextResponse.json(
      { error: `로그인 세션을 종료할 수 없습니다: ${signOutError.message}` },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    user.id
  );

  if (deleteError) {
    return NextResponse.json(
      { error: `계정을 삭제할 수 없습니다: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
