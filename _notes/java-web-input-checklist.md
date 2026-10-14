---
title: "Java 웹 입력·요청 (시큐어코딩)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Java]
tags: [java, secure-coding, xxe, ssrf, code-review]
description: "Java 웹 요청 처리 경로의 검증 누락(경로조작·업로드·오픈리다이렉트·XXE·SSRF·CSRF·XSS)의 개념과, 유형별 grep 신호·주입 구문·안전 API를 정리합니다."
mermaid: true
---

> 요청이 들어와 응답이 나가기까지, Java 웹 코드가 **입력을 어디서 검증 없이 쓰는가**를 유형별로 본다. 공통 원칙은 하나다 — 구조와 값을 분리하고, 목적지·형식을 허용 목록으로 고정한다.

## 개념

요청 처리 경로에서 입력이 파일 경로·리다이렉트 대상·XML 파서·외부 URL·HTML 출력에 그대로 닿으면 각각의 취약점이 된다. 코드 리뷰에서는 위험 API 호출의 인자가 상수인지, 요청 값(`getParameter`·`getHeader`·`getInputStream`)이 섞이는지를 역추적한다.

```java
new File("/data/" + req.getParameter("name"));          // 경로조작
resp.sendRedirect(req.getParameter("url"));             // 오픈 리다이렉트
DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(req.getInputStream()); // XXE
new URL(req.getParameter("target")).openStream();       // SSRF
out.print("<p>" + req.getParameter("q") + "</p>");      // XSS
```

## 공격·우회 구문

grep으로 위험 지점을 모으고, 허가된 테스트 서버에서 입력을 바꿔 동작 변화를 본다.

### 유형별 grep 신호 → 주입 입력

```
경로조작 (CWE-22):  new File(base+input) / Paths.get / FileInputStream
  입력: name=../../../../etc/passwd  /  ....//  /  %2e%2e%2f
업로드 (CWE-434):  MultipartFile.transferTo / getOriginalFilename 그대로 사용
  입력: shell.jsp / shell.jsp%00.png / 파일명에 ../ (경로+업로드 결합)
오픈 리다이렉트 (CWE-601):  sendRedirect / setHeader("Location", ...)
  입력: url=//attacker.example  /  url=https://attacker.example  /  url=/\attacker.example
XXE (CWE-611):  DocumentBuilderFactory / SAXParser / XMLReader (기본 설정)
  입력: <!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>
        <!ENTITY e SYSTEM "http://169.254.169.254/..."> (XXE→SSRF)
SSRF (CWE-918):  new URL(input).openConnection / HttpClient / RestTemplate
  입력: target=http://127.0.0.1/admin  /  http://169.254.169.254/
CSRF (CWE-352):  상태변경 @PostMapping 에 토큰 검증 없음
  입력: 외부 자동제출 폼 / 토큰 제거·변조
XSS (CWE-79):  out.print(input) / JSP ${param.x} / model 에 미이스케이프 값
  입력: <svg onload=alert(1)>  /  "><script>...</script>
```

### 안전 API 대조 (리뷰 기준)

```
경로   → Paths.get(base).resolve(name).normalize().startsWith(base)
업로드 → 서버 생성 파일명 + 확장자 허용목록 + 실행 불가 경로 저장
리다이렉트 → 허용 목록(상대경로·화이트리스트 도메인)만
XXE    → dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
SSRF   → 호스트 허용목록 + 사설/메타데이터 IP 차단 + 리다이렉트 재검증
XSS    → 출력 컨텍스트별 인코딩(OWASP Encoder), JSP는 <c:out>/fn:escapeXml
```

## 참고 자료

- [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)
- [CWE-601: URL Redirection to Untrusted Site (Open Redirect)](https://cwe.mitre.org/data/definitions/601.html)
