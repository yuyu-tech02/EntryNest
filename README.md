# EntryNest2

就活管理Webアプリケーション - Django + React SPA

## 概要

EntryNest2は、就活中のユーザーが企業ごとの就活状況（締切・進捗・ES提出履歴など）を効率的に管理できるWebアプリケーションです。

### 主な機能

- ユーザー登録・認証（メール + パスワード）
- 企業情報管理（CRUD）
- ES（エントリーシート）版管理
- 監査ログ（ログイン履歴、重要操作記録）
- セキュリティ対策（IDOR防止、CSRF保護、監査ログ）

## 技術スタック

### バックエンド
- Django 6.0
- Django REST Framework 3.16.1
- PostgreSQL（本番環境）/ SQLite（開発環境）
- セッションCookie認証

### フロントエンド
- React 18.3.1
- React Router 6.26.2
- Axios 1.7.2
- Vite 5.4.2

### デプロイ
- Render（予定）
- Neon PostgreSQL

## プロジェクト構成

```
EntryNest2/
├── backend/
│   ├── config/               # Django設定
│   │   ├── settings.py       # 設定ファイル
│   │   ├── urls.py           # URLルーティング
│   │   └── wsgi.py
│   ├── core/                 # メインアプリ
│   │   ├── models.py         # データモデル
│   │   ├── serializers.py    # DRFシリアライザー
│   │   ├── views_auth.py     # 認証ビュー
│   │   ├── views_company.py  # 企業管理ビュー
│   │   ├── views_es.py       # ES管理ビュー
│   │   ├── views_audit.py    # 監査ログビュー
│   │   ├── admin.py          # Django Admin設定
│   │   ├── signals.py        # シグナル
│   │   └── tests/            # テスト
│   ├── static/frontend/      # ビルド済みフロントエンド
│   ├── templates/frontend/   # フロントエンドテンプレート
│   ├── .env                  # 環境変数
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── features/         # 機能別コンポーネント
│   │   │   ├── auth/         # 認証
│   │   │   ├── companies/    # 企業管理
│   │   │   ├── es/           # ES管理
│   │   │   └── settings/     # 設定
│   │   ├── lib/              # ユーティリティ
│   │   ├── App.jsx           # メインアプリ
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── .gitignore
└── README.md
```

## セットアップ

### 1. バックエンドのセットアップ

```bash
cd backend

# 仮想環境作成
python -m venv .venv

# 仮想環境の有効化（Windows）
.venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# 環境変数の設定（.envファイルを作成）
# 開発環境ではSECRET_KEYは自動生成されますが、本番環境では必須です
# 本番環境用のSECRET_KEYを生成する場合:
# python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# マイグレーション
python manage.py migrate

# スーパーユーザー作成
python manage.py createsuperuser

# 開発サーバー起動
python manage.py runserver
```

**重要: 本番環境では必ず以下の環境変数を設定してください:**
- `DJANGO_SECRET_KEY`: セキュアなランダム文字列（必須）
- `DJANGO_DEBUG`: `0`（本番では必ずFalse）
- `DJANGO_ALLOWED_HOSTS`: カンマ区切りのホスト名

### 2. フロントエンドのセットアップ

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバー起動（バックエンドと並行）
npm run dev

# 本番ビルド
npm run build
```

ビルド後、`backend/static/frontend/`にファイルが出力され、Django経由で配信されます。

### 3. 環境変数の設定

`backend/.env`ファイルを作成（`.env.example`を参照）：

```env
DATABASE_URL=sqlite:///db.sqlite3
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
USE_SQLITE_FOR_TESTS=1
```

## 使い方

### 開発モード

**バックエンド:**
```bash
cd backend
.venv\Scripts\activate
python manage.py runserver
```

**フロントエンド（別ターミナル）:**
```bash
cd frontend
npm run dev
```

フロントエンド開発サーバー: http://localhost:5173
バックエンドAPI: http://localhost:8000

### 本番モード

```bash
# フロントエンドをビルド
cd frontend
npm run build

# Djangoサーバーのみ起動
cd ../backend
.venv\Scripts\activate
python manage.py runserver
```

アクセス: http://localhost:8000

## APIエンドポイント

### 認証
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/me` - 現在のユーザー情報
- `PATCH /api/me/settings` - 設定更新

### 企業管理
- `GET /api/companies/` - 企業一覧
- `POST /api/companies/` - 企業作成
- `GET /api/companies/{id}/` - 企業詳細
- `PATCH /api/companies/{id}/` - 企業更新
- `DELETE /api/companies/{id}/` - 企業削除

### ES管理
- `GET /api/es/` - ES一覧
- `GET /api/companies/{company_id}/es` - 特定企業のES一覧
- `POST /api/es/` - ES作成
- `GET /api/es/{id}/` - ES詳細
- `PATCH /api/es/{id}/` - ES更新
- `DELETE /api/es/{id}/` - ES削除

### 監査ログ
- `GET /api/auditlogs/` - 自分の監査ログ一覧

### ユーティリティ
- `GET /api/health` - ヘルスチェック
- `GET /api/csrf/` - CSRFトークン取得

## テスト

```bash
cd backend
.venv\Scripts\activate

# 全テスト実行
python manage.py test core.tests

# 特定のテストファイル実行
python manage.py test core.tests.test_auth
python manage.py test core.tests.test_company
python manage.py test core.tests.test_es
python manage.py test core.tests.test_audit
```

**テスト結果:** 32個のテストすべて成功 ✓

## セキュリティ機能

### IDOR（Insecure Direct Object Reference）防止
- すべてのモデルに`owner`フィールド
- すべてのViewSetで`owner=request.user`でフィルタリング
- 不正アクセスは404を返す（403ではなく情報漏洩防止）

### 監査ログ
- ログイン成功/失敗
- 全CUD操作（作成・更新・削除）
- IPアドレスとユーザーエージェント記録

### CSRF保護
- Django標準のCSRF保護
- セッションCookie（HttpOnly, SameSite=Lax）
- ログイン/登録エンドポイントでCSRF強制適用

### ファイルアップロードセキュリティ
- **認証済みユーザーのみアクセス可能**: メディアファイルは所有者のみダウンロード可能
- **ファイルサイズ制限**: 最大10MB
- **ファイルタイプ制限**: PDF, Word, Excel, PowerPoint, 画像, ZIP のみ許可
- **ディレクトリトラバーサル対策**: パス検証によるシステムファイルへのアクセス防止

### XSS防止
- すべてテキストのみ（HTML/Markdown不使用）
- React標準のエスケープ

### ブルートフォース攻撃対策
- **django-axes**: ログイン試行回数の制限とアカウントロック
  - 5回の失敗でアカウントロック
  - 30分間のクールダウン期間
  - IPアドレスとユーザー名の組み合わせでロック
  - 成功ログイン時に失敗カウントをリセット
- **django-ratelimit**: IPベースのレート制限
  - ログイン/登録エンドポイント: 5回/分
  - 同一IPからの短期間の大量リクエストを防止

## Django Admin

管理画面: http://localhost:8000/admin/

スーパーユーザーでログインして以下を管理可能：
- ユーザー
- 企業
- ES版
- 監査ログ（読み取り専用）

## ライセンス

このプロジェクトは個人開発用です。

## 開発者

Claude Code + EntryNest2チーム

---

**バージョン:** 1.0.0
**最終更新:** 2025-12-25
