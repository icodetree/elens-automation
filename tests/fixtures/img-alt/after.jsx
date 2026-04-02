import React from 'react';

export default function ImagePage() {
  return (
    <div>
      <h1>이미지 테스트</h1>

      {/* 케이스 1: alt 속성 없음 → 빈 alt 추가 예정 */}
      <img src="hero.jpg" alt="" />

      {/* 케이스 2: alt 속성 있음 → 변경 없음 */}
      <img src="logo.png" alt="회사 로고" />

      {/* 케이스 3: 장식 이미지 (role=presentation) → 변경 없음 */}
      <img src="divider.png" role="presentation" />

      {/* 케이스 4: aria-hidden=true → 변경 없음 */}
      <img src="deco.png" aria-hidden="true" />

      {/* 케이스 5: alt 속성 없음 → 빈 alt 추가 예정 */}
      <img src="photo.jpg" className="thumbnail" alt="" />
    </div>
  );
}
