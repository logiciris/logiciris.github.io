---
title: "정보 노출 (Information Disclosure)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Information Disclosure]
tags: [information-disclosure, error-handling, debug, web]
description: "오류 메시지·주석·백업·디버그 응답으로 내부 구조가 새는 정보 노출의 개념과, 오류 유발·숨은 경로·백업 파일·디버그 엔드포인트 확인 구문을 정리합니다."
mermaid: true
---

> 정보 노출은 그 자체로 끝나는 취약점이 아니라 **다음 공격의 지도**다. 내부 경로·버전·계정 형식·숨은 페이지가 드러나면 그다음 진단과 공격이 훨씬 쉬워진다.

## 개념

노출의 대부분은 새 기능이 아니라 **개발 때 쓰던 것이 운영에 남은 것**이다 — 자세한 오류 화면, 디버그 모드, 주석, 백업 파일, 테스트 페이지.

```python
app.config["DEBUG"] = True            # 운영에 디버그 모드 → 예외 시 스택·소스 노출
...
return {"user": row, "query": f"SELECT * FROM users WHERE id={uid}"}  # 내부 쿼리까지 응답
```

노출 한 건은 등급이 낮아도, 버전 노출 → 알려진 취약점, 내부 경로 → 경로 조작 정확도, 숨은 관리 페이지 → 인증 점검으로 **연결**되면 우선순위가 올라간다.

## 공격·우회 구문

허가된 범위에서, "무엇을 보면 노출인가"를 기준으로 본다.

### 오류 유발

```
존재하지 않는 경로 / 잘못된 타입(id=abc, id[]=1) / 빈 값 전송
→ 스택 트레이스, 프레임워크·버전, 서버 절대 경로, SQL 문구가 보이면 노출
로그인 실패가 "없는 사용자" vs "비밀번호 틀림"으로 갈리면 계정 열거(문구·시간·길이 차이 포함)
```

### 배너·헤더

```
Server, X-Powered-By, X-AspNet-Version 등으로 상세 버전 노출
```

### 소스·정적 파일

```
HTML 주석, 개발자 메모, 내부 주소
.map (소스맵), 번들에 남은 API 키·엔드포인트
```

### 숨은 경로·백업 파일

```
robots.txt, sitemap.xml, /.git/, /.env, /.svn/
백업·임시 사본: index.php.bak, config.php~, .DS_Store, app.zip
→ 소스가 실행되지 않고 '텍스트로 내려오면' 노출
디렉터리 인덱스(폴더 목록) 노출 여부
```

### 메서드·디버그 엔드포인트

```
OPTIONS 응답으로 허용 메서드(PUT/DELETE/TRACE) 확인
/actuator, /debug, /status, /__debug__, /server-status 가 인증 없이 열리는지
```

## 참고 자료

- [OWASP WSTG: Testing for Error Handling](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/08-Testing_for_Error_Handling/01-Testing_For_Improper_Error_Handling)
- [CWE-200: Exposure of Sensitive Information to an Unauthorized Actor](https://cwe.mitre.org/data/definitions/200.html)
- [CWE-209: Generation of Error Message Containing Sensitive Information](https://cwe.mitre.org/data/definitions/209.html)
