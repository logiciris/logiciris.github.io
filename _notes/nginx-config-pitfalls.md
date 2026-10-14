---
title: "Nginx 설정의 함정"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Infrastructure]
tags: [nginx, misconfiguration, web]
description: "location 매칭·alias 경로 조작·off-by-slash·merge_slashes·보안 헤더 누락 등 Nginx 설정 실수가 접근 제어와 경로를 깨는 원리와 확인 구문을 정리합니다."
mermaid: true
---

> Nginx는 코드 버그가 아니라 **설정 한 줄**로 접근 제어를 뚫고 소스를 노출한다. `location` 매칭 규칙과 `alias` 경로 처리가 특히 함정이다.

## 개념

흔한 설정 실수:

- **alias + 경로 조작(off-by-slash)**: `location /files { alias /var/data/; }`처럼 location에 끝 슬래시가 없으면 `/files../`로 상위 경로 접근.
- **정규식/접두 매칭 순서**: `location` 우선순위를 오해해 보호 규칙이 안 걸림.
- **merge_slashes off**: `//`·경로 변형으로 매칭 우회.
- **내부 경로 노출**: `location /admin`을 보호했지만 `/admin/`·대소문자·인코딩 변형이 다른 location으로.
- **보안 헤더 누락**: 에러 응답·특정 location에서 CSP·HSTS 헤더가 빠짐.

```nginx
location /static {
    alias /var/www/static/;   # /static 에 끝 슬래시 없음 → /static../ 로 탈출 가능
}
```

## 공격·우회 구문

허가된 범위에서만.

### alias 경로 조작 (off-by-slash)

```
/static../            → /var/www/ 로 상위 이동
/static../../etc/passwd
/files../conf/        설정·소스 노출
```

### location 매칭 우회

```
보호: location = /admin  →  우회: /admin/ , /admin/. , /Admin , /%61dmin
merge_slashes off: //admin , /./admin
정규식 location 의 앵커 누락으로 의도 밖 경로 매칭
```

### proxy_pass 경로 혼동

```
proxy_pass 뒤 경로 유무에 따라 전달 경로가 달라짐 → 내부 엔드포인트 노출
X-Accel-Redirect 헤더를 앱이 통제하면 내부 파일 반환
```

### 확인 요령

```
정적/다운로드 location 에 ../ 와 끝 슬래시 변형을 붙여 응답 변화
보호된 경로의 대소문자·인코딩·슬래시 변형으로 접근되는지
응답 헤더에서 보안 헤더가 페이지마다 일관되게 붙는지
```

## 참고 자료

- [Nginx: ngx_http_core_module (location, alias)](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-16: Configuration](https://cwe.mitre.org/data/definitions/16.html)
