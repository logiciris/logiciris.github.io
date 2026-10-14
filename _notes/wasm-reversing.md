---
title: "WebAssembly 분석 (WASM Reversing)"
date: 2026-10-15 09:00:00 +0900
categories: [Reversing, Static Analysis]
tags: [reversing, wasm, webassembly]
description: "브라우저에 숨긴 검증 로직을 담는 WebAssembly의 선형 메모리·스택 머신 구조를 이해하고, WAT 변환·런타임 메모리 덤프로 상태를 확인하는 개념과 구문을 정리합니다."
mermaid: true
---

> 검증·난독화 로직을 JS 대신 WebAssembly(WASM)에 넣는 경우가 늘었다. 바이너리처럼 보여도 구조가 단순한 **스택 머신**이라, 텍스트 포맷으로 바꾸면 흐름이 드러난다.

## 개념

WASM은 스택 기반 가상머신 코드다. 지역 변수(`local`)와 **선형 메모리(linear memory)** 라는 하나의 큰 바이트 배열을 쓰고, 연산은 스택에 값을 넣고 꺼내는 식이다. `.wasm`(바이너리)은 `.wat`(텍스트)로 1:1 변환되어 읽을 수 있고, JS와는 import/export 함수로 주고받는다.

```wat
(func $check (param $p i32) (result i32)
  local.get $p
  i32.const 0x5a
  i32.xor            ;; 입력 ^ 0x5a — 검증 로직이 그대로 보임
  ...)
```

## 공격·분석 구문

허가된(자작·분석권한) 대상 기준.

### 텍스트 변환·구조 파악

```
wasm2wat app.wasm -o app.wat        # 바이너리 → 텍스트
wasm-decompile app.wasm             # 더 읽기 쉬운 의사코드
(export "check" (func $check))       # export 로 진입점 찾기
(import "env" "..." )                # JS 와 주고받는 함수
data 세그먼트 = 초기화된 상수(정답 배열·문자열)
```

### 연산 알아보기 (스택 머신)

```
i32.xor / i32.and / i32.shl / i32.rotl   # 비트 연산(검증 루틴 신호)
i32.load / i32.store (offset=)           # 선형 메모리 접근(기준 배열)
call $f                                   # 함수 호출
br_if / if ... → 조기 반환(판정 분기)
```

### 런타임 메모리 덤프 (동적)

```js
// DevTools 콘솔에서 인스턴스의 메모리 열람
new Uint8Array(wasmInstance.exports.memory.buffer).slice(0x1000, 0x1040)
// export 함수를 직접 호출해 반환값(0/1) 관찰, 입력별 분기 추적
```

### 역산

```
검증이 가역 변환(XOR·회전)이면 data 세그먼트의 기준 상수에서 역산(→ 비트연산 역공학)
해시/일방향이면 역산 불가 → 대입·메모리 관찰로 전환
```

## 참고 자료

- [WebAssembly Specification](https://webassembly.github.io/spec/)
- [WABT: WebAssembly Binary Toolkit](https://github.com/WebAssembly/wabt)
- [MDN: WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
