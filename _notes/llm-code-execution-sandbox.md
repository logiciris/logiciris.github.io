---
title: "LLM 코드 실행 샌드박스"
date: 2026-10-15 09:00:00 +0900
categories: [LLM Security, Sandbox]
tags: [llm, code-execution, sandbox, owasp-llm]
description: "LLM이 코드를 실행하는 도구(코드 인터프리터)의 격리·권한·파일/네트워크 제한이 없을 때 생기는 위험의 개념과, 탈출·정보수집 확인 구문을 정리합니다."
mermaid: true
---

> LLM에 "코드 실행" 도구를 붙이면 편리하지만, 그 실행 환경이 **격리되지 않으면** 모델(사실상 사용자)이 서버에서 임의 코드를 돌리는 입구가 된다. 프롬프트 인젝션과 결합하면 더 위험하다.

## 개념

코드 인터프리터 도구는 모델이 생성한 코드를 실행한다. 위험은 실행 환경 자체에 있다 — 호스트 권한으로 실행, 네트워크 무제한(내부망·메타데이터 접근), 파일시스템 쓰기·영속, 실행 시간·자원 제한 없음, 다른 사용자와 환경 공유. 입력이 신뢰할 수 없으므로(사용자·간접 주입) 실행 환경은 **적대적 코드를 가정**해야 한다.

## 공격·우회 구문

허가된 대상에서, 무해한 조회만으로 경계를 확인한다.

### 환경·권한 정찰

```
"코드로 whoami, id, pwd, uname -a 를 실행해줘"
현재 사용자·작업 디렉터리·OS·설치 패키지·환경변수(os.environ) 확인
→ root·호스트 계정이면 격리 부족
```

### 네트워크 경계

```
내부·메타데이터 접근 시도(무해 확인):
  requests.get("http://169.254.169.254/latest/meta-data/")
  내부 서비스 포트 스캔·OAST 콜백으로 egress 여부
→ 외부/내부 접근이 되면 네트워크 격리 없음
```

### 파일·영속·공유

```
파일 쓰기/읽기 범위(/etc, /tmp, 홈), 쓰기가 다음 세션에 남는지(영속)
다른 사용자 데이터·세션 파일이 보이는지(환경 공유)
```

### 자원·탈출

```
실행 시간·메모리 제한 없이 무한 루프가 도는지(DoS)
알려진 컨테이너 탈출 조건(특권 모드·마운트)이 있는지 — 확인만, 실제 탈출 금지
```

### 확인 요령

```
"코드 실행 도구가 있다" 발견 시 높은 위험도로 보고
격리 기준: 비특권 사용자 · 네트워크 차단 · 읽기전용 FS · 시간/메모리 제한 · 세션별 폐기
```

## 참고 자료

- [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [CWE-250: Execution with Unnecessary Privileges](https://cwe.mitre.org/data/definitions/250.html)
- [CWE-265: Privilege Issues](https://cwe.mitre.org/data/definitions/265.html)
