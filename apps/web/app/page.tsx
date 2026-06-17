import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">🍜 Ramap</h1>
        <p className="text-xl text-gray-600 mb-8">
          라멘 오타쿠를 위한 전국 라멘 지도
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/map"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            지도 보기
          </Link>
          <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors">
            더 알아보기
          </button>
        </div>
      </div>
    </main>
  );
}
