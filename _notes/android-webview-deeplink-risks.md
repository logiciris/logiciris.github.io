---
title: "안드로이드 WebView·딥링크 위험"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Platform]
tags: [android, webview, deeplink, javascript-interface, intent]
description: "WebView의 JavaScript 활성화·원격 URL 로드와 딥링크로 들어오는 신뢰할 수 없는 입력이 만드는 안드로이드 플랫폼 위험의 개념과 확인 구문을 정리합니다."
mermaid: true
---

> WebView는 앱 안에 내장된 브라우저 컴포넌트다. JavaScript를 켜고 외부 URL·딥링크 입력을 그대로 로드하면, 웹 취약점과 네이티브 브릿지가 앱 권한 안에서 엮여 위험해진다.

## 개념

- **WebView**: HTML을 앱 안에서 렌더링하는 하이브리드 구성. JavaScript는 기본 비활성이라 동작시키려면 `javaScriptEnabled = true`를 켜는데, 이때 로드하는 콘텐츠·URL을 신뢰할 수 없으면 XSS·브릿지 남용으로 이어진다.
- **JavaScript 인터페이스**: `addJavascriptInterface`로 네이티브 객체를 JS에 노출하면, 로드된 페이지의 JS가 네이티브 메서드를 호출할 수 있다. 악성/변조 페이지가 들어오면 앱 권한을 빌린다.
- **딥링크**: 홈을 제외한 임의 화면으로 바로 진입시키는 링크. 외부에서 들어온 딥링크 파라미터를 검증 없이 쓰면 인증 우회·내부 화면 강제 진입·신뢰 경계 침범이 생긴다.

```kotlin
webView.settings.javaScriptEnabled = true   // 신뢰 못 할 콘텐츠면 위험
webView.loadUrl(externalUrl)                 // 외부 입력 URL 로드 주의
```

## 공격·확인 구문

허가된 대상에서만. 외부 입력은 `<url>`·`<param>`로 표기.

### WebView 설정·브릿지 확인

```
manifest 의 INTERNET 권한, WebView 가 로드하는 URL 출처
javaScriptEnabled = true 인가
addJavascriptInterface 로 노출된 네이티브 객체가 있는가
setAllowFileAccess / setAllowUniversalAccessFromFileURLs 과도 허용?
로드 URL 에 외부 입력이 반영되어 XSS → 브릿지 호출로 이어지는가
```

### 딥링크 입력 주입

```bash
# exported intent-filter 로 딥링크 강제 진입
adb shell am start -a android.intent.action.VIEW -d "example://<param>" com.example.app
# 인증 없이 내부 화면 진입 / 파라미터가 WebView·쿼리로 흘러드는지 확인
```

## 참고 자료

- [Android Developers: WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [OWASP MASTG: WebViews / Deep Links](https://mas.owasp.org/MASTG/techniques/android/)
- [CWE-749: Exposed Dangerous Method or Function](https://cwe.mitre.org/data/definitions/749.html)
