'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

export type PersonalizationView = 'all' | 'bookmarked' | 'hidden';

interface MapAuthButtonProps {
  user: User | null;
  isLoading: boolean;
  isSubmitting: boolean;
  activeView: PersonalizationView;
  isMenuOpen: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onMenuOpenChange: (isOpen: boolean) => void;
  onShowHiddenShops: () => void;
  onRequestAccountDeletion: () => void;
}

function KakaoTalkIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="15"
      viewBox="0 0 16 15"
      className="h-7 w-7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.00005 0C3.5815 0 0 2.76708 0 6.17983C0 8.30228 1.38525 10.1733 3.4947 11.2862L2.60715 14.5285C2.52873 14.815 2.85638 15.0433 3.10798 14.8773L6.99856 12.3096C7.32688 12.3412 7.66054 12.3597 8.00005 12.3597C12.4182 12.3597 16 9.59276 16 6.17983C16 2.76708 12.4182 0 8.00005 0Z"
        fill="black"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2.1 2.1 0 0 1-2.97 2.97l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65v.17a2.1 2.1 0 0 1-4.2 0v-.09a1.8 1.8 0 0 0-1.18-1.65 1.8 1.8 0 0 0-1.98.36l-.06.06a2.1 2.1 0 0 1-2.97-2.97l.06-.06a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.65-1.1H1.9a2.1 2.1 0 0 1 0-4.2h.09a1.8 1.8 0 0 0 1.65-1.18 1.8 1.8 0 0 0-.36-1.98l-.06-.06A2.1 2.1 0 0 1 6.19 3.7l.06.06a1.8 1.8 0 0 0 1.98.36H8.3A1.8 1.8 0 0 0 9.4 2.47V2.3a2.1 2.1 0 0 1 4.2 0v.09a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.06-.06a2.1 2.1 0 1 1 2.97 2.97l-.06.06a1.8 1.8 0 0 0-.36 1.98v.07a1.8 1.8 0 0 0 1.65 1.1h.17a2.1 2.1 0 0 1 0 4.2h-.09A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}

interface MenuButtonProps {
  children: ReactNode;
  onClick: () => void;
  isActive?: boolean;
  isDanger?: boolean;
}

function MenuButton({
  children,
  onClick,
  isActive = false,
  isDanger = false,
}: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ds-menu-item ${isActive ? 'ds-menu-item-active' : ''} ${
        isDanger ? 'text-gray-950' : ''
      }`}
    >
      {children}
    </button>
  );
}

export function MapAuthButton({
  user,
  isLoading,
  isSubmitting,
  activeView,
  isMenuOpen,
  onLogin,
  onLogout,
  onMenuOpenChange,
  onShowHiddenShops,
  onRequestAccountDeletion,
}: MapAuthButtonProps) {
  const isDisabled = isLoading || isSubmitting;
  const label = user ? '설정' : '카카오 로그인';
  const menuTitle = useMemo(() => user?.email ?? '로그인한 사용자', [user]);

  const runMenuAction = (action: () => void) => {
    action();
    onMenuOpenChange(false);
  };

  const handleMainClick = async () => {
    if (isDisabled) {
      return;
    }

    if (!user) {
      await onLogin();
      return;
    }

    onMenuOpenChange(!isMenuOpen);
  };

  const handleLogout = async () => {
    onMenuOpenChange(false);
    await onLogout();
  };

  return (
    <div className="absolute bottom-36 right-4 z-30">
      {user && isMenuOpen && (
        <div className="ds-panel absolute bottom-16 right-0 w-56 p-2">
          <div className="mb-1 truncate px-3 py-2 text-xs font-medium uppercase tracking-[0.05em] text-gray-500">
            {menuTitle}
          </div>
          <MenuButton
            onClick={() => runMenuAction(onShowHiddenShops)}
            isActive={activeView === 'hidden'}
          >
            숨긴 매장 보기
          </MenuButton>
          <div className="my-1 h-px bg-gray-100" />
          <MenuButton onClick={handleLogout}>로그아웃</MenuButton>
          <MenuButton
            onClick={() => runMenuAction(onRequestAccountDeletion)}
            isDanger
          >
            계정 삭제
          </MenuButton>
        </div>
      )}

      <button
        type="button"
        onClick={handleMainClick}
        disabled={isDisabled}
        className={`ds-icon-button h-14 w-14 text-sm font-bold shadow-[var(--ds-shadow-soft)] ring-2 ring-white disabled:cursor-not-allowed disabled:opacity-70 ${
          user
            ? isMenuOpen
              ? 'ds-icon-button-active'
              : ''
            : 'bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]'
        }`}
        aria-label={label}
        aria-expanded={user ? isMenuOpen : undefined}
        title={label}
      >
        {isDisabled ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-b-transparent" />
        ) : user ? (
          <SettingsIcon />
        ) : (
          <KakaoTalkIcon />
        )}
      </button>
    </div>
  );
}
