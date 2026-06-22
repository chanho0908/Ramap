import { Suspense } from 'react';
import { AuthCallbackClient } from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-3xl font-bold">로그인 처리 중</h1>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
