import React from 'react';

export default function FormPage() {
  return (
    <form>
      <h1>폼 테스트</h1>

      {/* 케이스 1: aria-label 있음 → 변경 없음 */}
      <input type="text" aria-label="이름" />

      {/* 케이스 2: aria-label 있음 (email) → 변경 없음 */}
      <input type="email" aria-label="이메일 주소" />

      {/* 케이스 3: placeholder 있음, label 없음 → aria-label 추가 예정 (Grade A) */}
      <input type="text" placeholder="검색어를 입력하세요" />

      {/* 케이스 4: hidden 타입 → 스킵 */}
      <input type="hidden" name="csrf_token" />

      {/* 케이스 5: 아무 레이블도 없음 → Grade B */}
      <input type="password" name="password" />
    </form>
  );
}
