---
title: "접근 제어 실패와 IDOR"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Access Control]
tags: [idor, access-control, authorization, web]
description: "인증은 확인하지만 요청한 자원이 그 사람 것인지 확인하지 않을 때 생기는 IDOR의 개념과, 식별자 교체·수평·수직 접근·클라이언트 신뢰 값 확인 구문을 정리합니다."
mermaid: true
---

> 인증은 "누구인가"를, 인가는 "이걸 해도 되는가"를 확인한다. 로그인만 확인하고 **요청한 자원이 그 사람의 것인지** 확인하지 않으면, 식별자만 바꿔도 남의 데이터에 닿는다. 이것이 IDOR이며 접근 제어 실패의 가장 흔한 형태다.

## 개념

취약한 앱은 "로그인했는가"만 묻고 "내 자원인가"를 묻지 않는다. 그러면 식별자가 순차적이든 UUID든, **알아낼 수 있는 식별자**가 곧 접근 권한이 된다.

```python
@app.get("/api/memo/<int:memo_id>")
def get_memo(memo_id):
    if "user_id" not in session:        # 인증만 확인
        return "", 401
    memo = db.query("SELECT * FROM memo WHERE id = ?", memo_id)
    return jsonify(memo)                # 소유자 확인 없음
```

영향은 조회(개인정보 노출), 수정·삭제(무결성 파괴), 관리자 기능 호출(권한 상승)까지다. UUID로 바꿔도 목록 API·공유 링크·로그·이메일에서 식별자가 새면 그대로 성립한다. 사용자 ID·역할을 **요청 본문·쿠키에서 받아 신뢰하면** 그 값을 바꿔 버린다. 누락은 가장 최근 추가된 API·모바일 전용 API·내보내기/일괄 처리에서 흔하다.

## 공격·우회 구문

진단용 계정 A·B를 만들고, 각자 자원을 하나씩 만들어 기준선을 잡는다.

### 수평 접근 (같은 역할의 남의 자원)

```
A 세션으로 B의 식별자 요청:
  GET  /api/memo/1002        (내 것은 1001)
  POST /api/memo/delete      memo_id=1002
식별자 위치: URL 경로·쿼리·본문·헤더·쿠키·숨은 필드의 id/번호/파일명/이메일
```

### 수직 접근 (일반 → 관리자)

```
일반 계정으로 관리자 전용 경로·기능 직접 호출
화면에서 메뉴가 숨겨진 것은 방어가 아님 — 엔드포인트를 직접 때림
```

### 클라이언트 신뢰 값 교체

```
user_id / role / tenant 를 요청에서 보내는지 → 바꾸면 서버가 따르는지
role=admin, is_admin=true, user_id=<타인> 로 변조
```

### 메서드·경로 차이

```
GET 은 막혔는데 PUT·DELETE·PATCH 는 열림
/api/v2/ , /api/mobile/ , /export , /download 같은 우회 경로
```

### 확인 요령

```
403·404 라도 응답 길이·시간이 정상 자원과 다르면 존재 여부 노출 의심
```

## 참고 자료

- [OWASP Top 10 2021: A01 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
