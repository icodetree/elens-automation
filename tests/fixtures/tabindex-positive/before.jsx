import React from 'react';

export default function TabindexPage() {
  return (
    <div>
      {/* tabIndex 양수: 위반 */}
      <button id="btn1" tabIndex={1}>저장</button>
      <a href="/home" tabIndex={2}>홈으로</a>
      <div id="div1" tabIndex={3}>클릭 가능 영역</div>
      {/* tabIndex="0" 문자열: 위반 */}
      <span tabIndex="5">텍스트</span>
      {/* tabIndex={0}: 정상 */}
      <input type="text" tabIndex={0} />
      {/* tabIndex={-1}: 정상 */}
      <span tabIndex={-1}>숨겨진 포커스</span>
      {/* tabIndex 없음: 정상 */}
      <button>취소</button>
    </div>
  );
}
