---
title: "모델·에이전트 서비스 거부 (LLM DoS)"
date: 2026-10-15 09:00:00 +0900
categories: [LLM Security, Availability]
tags: [llm, dos, resource-exhaustion, owasp-llm]
description: "토큰·호출 폭주, 무한 도구 루프, 긴 컨텍스트로 모델 서비스의 비용·가용성을 공격하는 LLM 자원 고갈의 개념과, 증폭·루프 유발 확인 구문을 정리합니다."
mermaid: true
---

> LLM 호출은 토큰 수에 비례해 **비용과 시간**이 든다. 공격자가 입력·출력·도구 호출을 부풀리면, 요청 몇 개로 비용을 폭증시키거나 서비스를 느리게·멈추게 만든다(LLM10: Unbounded Consumption).

## 개념

자원 고갈 경로: 아주 긴 입력(최대 컨텍스트), 아주 긴 출력 유도("무한히 이어서"), 에이전트의 **도구 호출 루프**(서로를 계속 부름), 비싼 도구 반복 호출, 재귀적 요약/확장. 한도(토큰·호출·시간·비용)가 없으면 소수 요청으로 큰 피해가 난다.

## 공격·우회 구문

허가된 대상·테스트 환경에서, 소량으로 한계만 확인한다.

### 입력·출력 증폭

```
최대 길이 입력(컨텍스트 꽉 채우기) + "전부 자세히 분석해"
출력 폭주: "1부터 아주 큰 수까지 전부 나열해 / 끝없이 이어서 써"
반복 유도: "방금 답을 10배 더 길게, 그걸 또 10배로"
```

### 도구·에이전트 루프

```
서로를 호출하게 유도: 도구 A→B→A 순환
"목표를 달성할 때까지 계속 재시도해" (종료 조건 없는 자율 루프)
비싼 도구(검색·코드실행·외부 API) 반복 호출 유도
```

### 비용·한도 관찰

```
응답 시간·토큰 사용량이 입력에 비례해 무한히 느는지
요청 수·토큰·도구 호출·실행 시간 상한이 있는지(rate limit·max_tokens·타임아웃)
동일 사용자의 폭주가 계정/키 단위로 제한되는지
```

### 확인 요령 (방어 기준)

```
입력·출력 토큰 상한, 요청 빈도 제한, 도구 호출 횟수·깊이 제한
에이전트 루프에 최대 스텝·타임아웃·종료 조건
사용자·테넌트별 비용 쿼터와 알림
```

## 참고 자료

- [OWASP LLM10:2025 Unbounded Consumption](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/)
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
