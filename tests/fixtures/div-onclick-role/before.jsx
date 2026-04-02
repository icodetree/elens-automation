import React from 'react';

export default function DivOnclickPage() {
  return (
    <div>
      {/* role 없음: 위반 */}
      <div onClick={() => {}}>클릭 가능한 영역</div>
      {/* span role 없음: 위반 */}
      <span onClick={() => {}}>실행</span>
      {/* role 있음: 정상 */}
      <div role="button" onClick={() => {}} tabIndex={0}>이미 올바름</div>
      {/* onClick + tabIndex 있으나 role 없음: 위반 */}
      <div onClick={() => {}} tabIndex={0}>탭인덱스만 있음</div>
      {/* onClick 없음: 정상 */}
      <div>일반 div</div>
    </div>
  );
}
