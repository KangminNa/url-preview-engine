# Classifiers

URL과 metadata를 기반으로 리소스 축을 분류합니다.

## 역할

- `provider-classifier.ts`: 호스트 기반 provider label 판별
- `url-classifier.ts`: URL shape 판별(direct-image, root, path-document 등)
- `resource-type-classifier.ts`: video/article/image/audio/website 판별
- `page-kind-classifier.ts`: atomic/homepage/collection/profile 판별
- `*.types.ts`: classifier 입력/규칙 interface 분리

## 설계 포인트

- site 하드코딩 대신 규칙 객체(`Rule Object`) 기반 분류
- 분류 결과는 capability 판단의 입력값으로 사용됨
