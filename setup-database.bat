@echo off
echo 🗄️ Setting up PostgreSQL Database for ExpenseFlow Pro...
echo.

:: Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    echo 📋 Please install Docker Desktop from: https://docs.docker.com/desktop/install/windows/
    goto :end
)

echo ✅ Docker is available

:: Stop existing containers
echo 🛑 Stopping existing database containers...
docker stop expenseflow-postgres >nul 2>&1
docker rm expenseflow-postgres >nul 2>&1

:: Create Docker network
echo 🌐 Creating Docker network...
docker network create expenseflow-network >nul 2>&1

:: Start PostgreSQL container
echo 🚀 Starting PostgreSQL container...
docker run -d ^
  --name expenseflow-postgres ^
  --network expenseflow-network ^
  -e POSTGRES_DB=expenseflow_pro ^
  -e POSTGRES_USER=expenseflow ^
  -e POSTGRES_PASSWORD=password123 ^
  -p 5432:5432 ^
  -v expenseflow_data:/var/lib/postgresql/data ^
  postgres:15

if %errorlevel% neq 0 (
    echo ❌ Failed to start PostgreSQL container
    goto :error
)

echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

:: Test database connection
echo 🧪 Testing database connection...
docker exec expenseflow-postgres pg_isready -U expenseflow -d expenseflow_pro >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Database connection failed
    goto :error
)

echo ✅ PostgreSQL is running successfully!

:: Create .env file
echo 📝 Creating environment configuration...
(
echo # ExpenseFlow Pro Environment Configuration
echo NODE_ENV=development
echo PORT=8001
echo.
echo # Database Configuration
echo DATABASE_URL=postgresql://expenseflow:password123@localhost:5432/expenseflow_pro
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=expenseflow_pro
echo DB_USER=expenseflow
echo DB_PASSWORD=password123
echo.
echo # Ollama Configuration
echo OLLAMA_HOST=http://localhost:11434
echo OLLAMA_MODEL=llava:latest
echo.
echo # Security Configuration
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo ENCRYPTION_KEY=your-32-char-encryption-key-here
echo.
echo # File Upload Configuration
echo UPLOAD_DIR=./uploads
echo MAX_FILE_SIZE=50MB
echo.
echo # Frontend Configuration
echo NEXT_PUBLIC_API_URL=http://localhost:8001
) > .env

echo ✅ Environment file created

:: Install database dependencies
echo 📦 Installing database dependencies...
npm install prisma @prisma/client pg

:: Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

:: Run database migrations
echo 🗄️ Running database migrations...
npx prisma db push

:: Seed database
echo 🌱 Seeding database with initial data...
node prisma/seed.js

echo.
echo 🎉 Database setup complete!
echo 📋 Database Information:
echo    📍 Host: localhost:5432
echo    🗃️ Database: expenseflow_pro
echo    👤 User: expenseflow
echo    🔑 Password: password123
echo    🔗 URL: postgresql://expenseflow:password123@localhost:5432/expenseflow_pro
echo.
echo 📋 Useful Commands:
echo    🔍 Check status: docker ps
echo    🛑 Stop database: docker stop expenseflow-postgres
echo    🚀 Start database: docker start expenseflow-postgres
echo    📊 Access DB: docker exec -it expenseflow-postgres psql -U expenseflow -d expenseflow_pro
echo.
goto :end

:error
echo ❌ Database setup failed!
echo 📋 Manual troubleshooting:
echo    1. Make sure Docker Desktop is running
echo    2. Check if port 5432 is available
echo    3. Run: docker logs expenseflow-postgres
echo.

:end
pause 