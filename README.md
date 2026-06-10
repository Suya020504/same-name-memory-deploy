# 같은 이름, 다른 기억 지도 사이트

단일 HTML로 제작된 발표/지도 자료를 도메인 배포가 가능한 정적 사이트 구조로 정리한 폴더입니다.

## 주소 구조

- `/` 또는 `/index.html`: 발표/지도 선택 화면
- `/presentation.html`: 발표 전용 화면
- `/map.html`: 지도 전용 화면

발표용 파일의 이미지 슬라이드 덱은 원본에서 외부 이미지 폴더를 참조하지만, 현재 제공된 ZIP과 폴더 안에는 해당 이미지 파일이 없습니다. 그래서 발표 페이지는 이미지 슬라이드 덱 대신 HTML 기반 발표 화면이 바로 열리도록 설정했습니다.

## 로컬 확인

```bash
npm run build
npm run start
```

열리는 주소:

```text
http://127.0.0.1:4174
http://127.0.0.1:4174/presentation.html
http://127.0.0.1:4174/map.html
```

기능 검증:

```bash
npm run verify
```

## Vercel 배포 설정

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: 비워 두거나 기본값 사용

실제 배포와 도메인 연결은 Vercel/GitHub 계정 작업이 필요하므로, 계정 로그인과 외부 업로드 전에 별도 확인이 필요합니다.
