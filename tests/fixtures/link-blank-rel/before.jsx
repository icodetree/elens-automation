import React from 'react';

export default function LinkPage() {
  return (
    <div>
      {/* rel 없음: 위반 */}
      <a href="https://example.com" target="_blank">예제 사이트</a>
      {/* rel에 noopener 없음: 위반 */}
      <a href="https://other.com" target="_blank" rel="nofollow">다른 사이트</a>
      {/* rel에 noopener 있음: 정상 */}
      <a href="https://safe.com" target="_blank" rel="noopener noreferrer">안전한 사이트</a>
      {/* target="_blank" 없음: 정상 */}
      <a href="/internal">내부 링크</a>
    </div>
  );
}
