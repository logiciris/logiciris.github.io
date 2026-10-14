---
title: "안드로이드 APK 정적 분석"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Static]
tags: [android, apk, jadx, apktool, smali, reversing]
description: "APK를 추출·디컴파일해 자바/스몰리 코드와 네이티브 라이브러리 진입점을 읽는 안드로이드 정적 분석의 개념과 도구 구문을 정리합니다."
mermaid: true
---

> APK는 사실상 ZIP 아카이브다. 꺼내서 디컴파일하면 자바 수준 코드·리소스·네이티브 라이브러리를 읽을 수 있고, 여기서 탐지 로직·하드코딩된 값·진입점을 찾아 동적 분석 대상 메서드를 정한다.

## 개념

- **추출**: 설치된 앱의 APK(요즘은 기능별로 쪼갠 **split APK**)를 단말에서 뽑는다. 단순 추출 도구는 split을 못 모으는 경우가 있어 split 지원 도구를 쓴다.
- **디컴파일**: `jadx`로 DEX → 자바 유사 코드로 역변환해 전체 구조를 읽고, `apktool`로 리소스·`AndroidManifest.xml`·**smali**(Dalvik 어셈블리)를 얻는다. 무결성 패치는 smali 수준에서 한다.
- **네이티브 라이브러리**: 핵심 탐지·암호 로직은 `lib/<abi>/*.so`에 숨는 경우가 많다. 로딩 진입점은 `JNI_OnLoad`이며, `.so`는 Ghidra/IDA로 분석한다.

## 공격·확인 구문

허가된 대상에서만.

### 추출·디컴파일

```bash
# 설치 경로 확인
adb shell pm path com.example.app

# 디컴파일 (자바 유사 코드)
jadx-gui app.apk

# 리소스·manifest·smali
apktool d app.apk
```

### 네이티브 라이브러리 위치

```
# 앱 설치 경로 아래
/data/app/~~<random>/com.example.app-<random>/lib/arm64/libexample.so
# 분석 진입점: JNI_OnLoad → Ghidra/IDA 로 디스어셈블
```

### smali 무결성 테스트 패치 예

```smali
# 분기 지점에 토스트를 넣어 패치가 먹히는지 먼저 확인
const-string v0, "integrity test"
const/4 v1, 0x0
invoke-static {p0, v0, v1}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;
move-result-object v0
invoke-virtual {v0}, Landroid/widget/Toast;->show()V
```

## 참고 자료

- [jadx](https://github.com/skylot/jadx)
- [Apktool](https://apktool.org/)
- [OWASP MASTG: Android Static Analysis](https://mas.owasp.org/MASTG/techniques/android/)
