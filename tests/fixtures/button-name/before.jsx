import React from 'react';

export default function ButtonPage() {
  return (
    <div>
      <h1>버튼 테스트</h1>

      {/* 케이스 1: 텍스트 있음 → 변경 없음 */}
      <button>저장</button>

      {/* 케이스 2: aria-label 있음 → 변경 없음 */}
      <button aria-label="닫기">×</button>

      {/* 케이스 3: 내부 img에 alt 있음 → aria-label 추가 예정 (Grade A) */}
      <button>
        <img src="search.svg" alt="검색" />
      </button>

      {/* 케이스 4: 빈 버튼, img도 없음 → Grade B */}
      <button></button>
    </div>
  );
}
