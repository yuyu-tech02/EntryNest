# EntryNest デプロイメントガイド

## セキュリティ改善の概要

このプロジェクトには以下のセキュリティ強化が実装されています：

### 1. CORS設定（本番環境対応）
- 開発環境：`http://localhost:5173`を自動許可
- 本番環境：`CORS_ALLOWED_ORIGINS`環境変数から読み込み
- 設定場所：`backend/config/settings.py:209-228`

### 2. APIレート制限
- **認証エンドポイント**：5リクエスト/分（IPベース）
  - `/api/auth/register`
  - `/api/auth/login`
- **CRUD エンドポイント**：100リクエスト/時（ユーザーベース）
  - CompanyViewSet
  - ESVersionViewSet
- **設定更新**：30リクエスト/分（ユーザーベース）
  - MeSettingsView

### 3. 管理画面URLのカスタマイズ
- デフォルト：`/secure-admin/`
- 環境変数`DJANGO_ADMIN_URL`でカスタマイズ可能
- ブルートフォース攻撃のリスクを軽減

### 4. ロギング機能
- アプリケーションログ：`backend/logs/django.log`
- セキュリティログ：`backend/logs/security.log`
- 自動ローテーション：15MB × 10ファイル
- django-axesのログも記録

### 5. セキュリティヘッダー
- `X-Frame-Options: DENY`（クリックジャッキング防止）
- `X-Content-Type-Options: nosniff`（MIMEスニッフィング防止）
- `Referrer-Policy: same-origin`（リファラー情報制御）
- HSTS有効（本番環境のみ、1年間）

### 6. その他のセキュリティ機能
- **IDOR防止**：すべてのクエリで`owner=request.user`フィルタリング
- **CSRF保護**：トークンベースの保護
- **ブルートフォース対策**：django-axes（5回失敗で30分ロック）
- **包括的な監査ログ**：すべてのCRUD操作を記録

---

## CI/CD パイプライン

### CI（継続的インテグレーション）

`.github/workflows/ci.yml`で以下を自動実行：

#### Frontend
- Node.js 20でビルド
- npm依存関係のキャッシュ
- ビルド成果物をアーティファクトとして保存

#### Backend
- Python 3.12でテスト
- Django checkコマンド実行
- Pythonファイルのコンパイルチェック
- **pip-audit**による依存関係の脆弱性スキャン
- セキュリティレポートを30日間保存

#### Docker
- Docker Buildxでマルチプラットフォームビルド
- GitHub Actionsキャッシュ利用で高速化

#### Security Check
- ハードコードされたシークレットの検出
- `.env`ファイルがGit追跡されていないことを確認

### CD（継続的デプロイ）

`.github/workflows/deploy.yml`で本番デプロイ：

- **トリガー**：mainブランチへのpush、または手動実行
- **Dockerイメージ**：ビルドとタグ付け
- **デプロイ先の設定例**：
  - GitHub Container Registry（ghcr.io）
  - Docker Hub
  - AWS ECS
  - Railway
  - カスタムサーバー（SSH経由）

---

## Render へのデプロイ（Docker不要・推奨）

**Render**は Docker なしで Python + Node.js アプリをデプロイ可能な PaaS です。

### 方法1: Blueprint（render.yaml）を使う自動セットアップ

1. **Render アカウント作成**: https://render.com/
2. **リポジトリ連携**: New → Blueprint → GitHubリポジトリを選択
3. Render が `render.yaml` を検出し、Web Service + Database を自動作成
4. **環境変数を設定**（Dashboard → Environment）:
   - `DJANGO_ALLOWED_HOSTS`: `your-app.onrender.com`
   - `CORS_ALLOWED_ORIGINS`: `https://your-app.onrender.com`
5. デプロイ完了を待つ（初回は10分程度）

### 方法2: 手動セットアップ

#### Step 1: PostgreSQL Database 作成
1. Render Dashboard → New → PostgreSQL
2. Name: `entrynest-db`
3. 作成後、`Internal Database URL` をコピー

#### Step 2: Web Service 作成
1. New → Web Service → GitHubリポジトリ選択
2. 設定:
   - **Name**: `entrynest`
   - **Runtime**: Python
   - **Build Command**: `./build.sh`
   - **Start Command**: `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

#### Step 3: 環境変数設定
```
PYTHON_VERSION=3.12.0
NODE_VERSION=20
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=<自動生成 or 手動設定>
DJANGO_ALLOWED_HOSTS=your-app.onrender.com
DATABASE_URL=<Step1でコピーしたURL>
CORS_ALLOWED_ORIGINS=https://your-app.onrender.com
DJANGO_ADMIN_URL=secure-admin/
```

### デプロイ後の確認

- **SPA表示**: `https://your-app.onrender.com/`
- **ヘルスチェック**: `https://your-app.onrender.com/api/health`
- **管理画面**: `https://your-app.onrender.com/secure-admin/`

### Superuser作成（初回のみ）

RenderのShell機能を使用:
```bash
cd backend
python manage.py createsuperuser
```

---

## 本番環境デプロイ手順（Docker使用）


### 1. 環境変数の設定

`backend/.env`ファイルを作成（`.env.example`を参考）：

```bash
# 必須環境変数
DJANGO_SECRET_KEY=<強力なランダム値>
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# オプション
DJANGO_ADMIN_URL=your-custom-admin-url/
```

**SECRET_KEYの生成**：
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2. データベースのセットアップ

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

### 3. 静的ファイルの収集

```bash
python manage.py collectstatic --noinput
```

### 4. Dockerでのデプロイ

```bash
# ビルド
docker build -t entrynest:latest .

# 実行
docker run -d \
  --name entrynest \
  -p 8000:8000 \
  --env-file backend/.env \
  entrynest:latest
```

### 5. Docker Composeでのデプロイ

`docker-compose.yml`を作成：

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: entrynest
      POSTGRES_USER: entrynest
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  app:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - ./backend/media:/app/backend/media
      - ./backend/logs:/app/backend/logs

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./backend/staticfiles:/app/static
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

起動：
```bash
docker-compose up -d
```

---

## セキュリティチェックリスト

### デプロイ前
- [ ] `DJANGO_SECRET_KEY`を強力なランダム値に設定
- [ ] `DJANGO_DEBUG=0`に設定
- [ ] `DJANGO_ALLOWED_HOSTS`を本番ドメインに設定
- [ ] `DATABASE_URL`をPostgreSQLに設定（SSL必須）
- [ ] `CORS_ALLOWED_ORIGINS`を本番URLに設定
- [ ] `.env`ファイルが`.gitignore`に含まれていることを確認
- [ ] 管理画面URLをカスタマイズ（推奨）

### デプロイ後
- [ ] HTTPS証明書の設定（Let's Encryptなど）
- [ ] データベースバックアップの設定
- [ ] ログ監視の設定
- [ ] セキュリティスキャンの定期実行
- [ ] 依存関係の定期更新

---

## CI/CDの設定

### GitHub Container Registryの有効化

1. GitHubリポジトリの Settings → Actions → General
2. "Workflow permissions"で"Read and write permissions"を選択
3. `.github/workflows/deploy.yml`のコメントを解除

### Docker Hubの使用

1. Docker Hubでアクセストークンを生成
2. GitHubリポジトリの Settings → Secrets → Actions
3. `DOCKERHUB_USERNAME`と`DOCKERHUB_TOKEN`を追加
4. `.github/workflows/deploy.yml`のDocker Hubセクションのコメントを解除

### デプロイ先の設定

デプロイ先に応じて`.github/workflows/deploy.yml`の該当セクションのコメントを解除し、必要なシークレットを設定してください。

---

## トラブルシューティング

### ログの確認

```bash
# アプリケーションログ
tail -f backend/logs/django.log

# セキュリティログ
tail -f backend/logs/security.log

# Docker logs
docker logs entrynest
```

### レート制限のリセット

django-ratelimitはデフォルトでキャッシュを使用します。リセットするには：

```python
# Django shell
python manage.py shell

from django.core.cache import cache
cache.clear()
```

### 管理画面にアクセスできない

カスタムURLを確認：
```bash
echo $DJANGO_ADMIN_URL
# または
# https://yourdomain.com/secure-admin/
```

---

## モニタリングとメンテナンス

### 推奨ツール
- **Sentry**：エラートラッキング
- **New Relic / DataDog**：APM
- **CloudWatch / Stackdriver**：ログ集約
- **Dependabot**：依存関係の自動更新

### 定期タスク
- 週次：セキュリティスキャン（`pip-audit`）
- 月次：依存関係の更新
- 四半期：セキュリティ監査

---

## サポート

問題が発生した場合：
1. ログファイルを確認
2. GitHub Actionsの実行結果を確認
3. セキュリティレポートを確認（`audit-report.json`）
