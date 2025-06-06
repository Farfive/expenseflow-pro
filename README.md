# ExpenseFlow Pro 💼✨

## 🌟 Document-First, Web-Only Expense Management System

ExpenseFlow Pro is a cutting-edge expense management solution designed for Polish businesses and expanding to CEE markets. Built with a "Document-First" approach, it leverages local AI (Ollama LLaVA) for secure, intelligent document processing.

### ✨ Key Features

- 🤖 **Local AI-Powered OCR**: Secure document processing with Ollama LLaVA
- 🏦 **Smart Bank Integration**: Automated transaction matching
- 📊 **Advanced Analytics**: Real-time insights and reporting
- 🔒 **Enterprise Security**: GDPR-compliant, local data processing
- 🌍 **Multi-language Support**: Polish, English, with CEE expansion ready
- 📱 **Modern UI**: Clean, intuitive web interface

### 🚀 Technology Stack

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: Modern HTML5, CSS3, JavaScript
- **AI/OCR**: Ollama LLaVA (local processing)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based security
- **Deployment**: Docker-ready

### 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Python 3.8+ (for AI components)
- Ollama (for local LLaVA model)
- Docker (optional, for containerized deployment)

### ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/expenseflow-pro.git
   cd expenseflow-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Setup database**
   ```bash
   # Windows
   setup-database.bat
   
   # Or manually configure PostgreSQL and run:
   # npx prisma migrate dev
   ```

4. **Setup Ollama AI**
   ```bash
   # Windows
   setup-ollama.bat
   
   # Or manually install Ollama and pull LLaVA model
   ```

5. **Start the application**
   ```bash
   # Complete setup (recommended for first run)
   complete-setup.bat
   
   # Or quick start
   npm start
   ```

6. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Default admin credentials will be displayed in the console

### 🏗️ Project Structure

```
expenseflow-pro/
├── src/                    # Core application logic
├── frontend/              # Web frontend assets
├── prisma/               # Database schema and migrations
├── uploads/              # Document storage
├── tests/                # Test suites
├── locales/              # Internationalization
├── fresh-server.js       # Main server application
├── docker-compose.yml    # Docker configuration
└── setup scripts/        # Automated setup tools
```

### 📱 Core Functionality

#### Document Processing
- **Receipt & Invoice OCR**: Automated data extraction from Polish documents
- **Bank Statement Processing**: PDF table parsing for transaction data
- **Smart Matching**: AI-powered transaction to document correlation
- **Multi-format Support**: JPG, PNG, PDF processing

#### Business Intelligence
- **Real-time Dashboard**: Expense analytics and insights
- **Category Analysis**: Automated expense categorization
- **Compliance Reporting**: Polish tax and VAT reporting features
- **Export Capabilities**: Multiple format exports (PDF, Excel, CSV)

#### Enterprise Features
- **Multi-user Support**: Role-based access control
- **Company Management**: Multi-entity support
- **Approval Workflows**: Configurable expense approval processes
- **Integration Ready**: REST API for third-party integrations

### 🔧 Configuration

#### Environment Variables
Create a `.env` file with:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/expenseflow_pro"
JWT_SECRET="your-jwt-secret-key"
NODE_ENV="development"
OLLAMA_HOST="http://localhost:11434"
UPLOAD_MAX_SIZE="10MB"
```

#### AI Model Setup
```bash
# Install Ollama
ollama pull llava:7b

# Verify installation
ollama list
```

### 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Browser-based UI testing
npm run test:browser
```

### 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 📊 Performance & Monitoring

- **OCR Processing**: Target <10 seconds per document
- **Database**: Optimized for 10,000+ transactions
- **Concurrent Users**: Supports 100+ simultaneous users
- **Uptime**: 99.9% availability target

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🌟 Roadmap

- [ ] Mobile applications (iOS/Android)
- [ ] Advanced AI categorization
- [ ] Multi-currency support
- [ ] CEE market expansion
- [ ] Enterprise SSO integration
- [ ] Advanced reporting modules

### 💬 Support

- 📧 Email: support@expenseflow-pro.com
- 💬 Issues: [GitHub Issues](https://github.com/yourusername/expenseflow-pro/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/expenseflow-pro/wiki)

### 🏆 Acknowledgments

- Ollama team for the amazing local AI capabilities
- Polish business community for feature feedback
- Open source contributors and testers

---

**Built with ❤️ for Polish businesses, expanding to CEE markets**

*Transform your expense management with intelligent document processing and seamless bank integration.* 