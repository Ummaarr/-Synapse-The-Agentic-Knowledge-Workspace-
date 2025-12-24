# Synapse - AI-Powered Chat Application

Synapse is a full-stack AI-powered chat application with file processing capabilities, built with Next.js and Node.js. The application features an intelligent agent powered by LangChain and LangGraph, capable of processing various file types (PDF, CSV) and providing AI-driven responses.

## Features

- 🤖 **AI-Powered Chat**: Interactive chat interface with LangChain/LangGraph integration
- 📄 **File Processing**: Upload and process PDF and CSV files
- 📧 **Email Integration**: Send emails through the application
- 💾 **Data Persistence**: MongoDB database for storing chunks and conversation data
- 🎨 **Modern UI**: Built with Next.js, React, and Tailwind CSS
- 📊 **Data Visualization**: Chart components for data analysis

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Data visualization

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (via Mongoose)
- **LangChain** - AI framework
- **LangGraph** - Agent orchestration
- **Ollama** - Local AI model integration
- **Multer** - File upload handling
- **Nodemailer** - Email functionality

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **Ollama** (optional, for local AI models)

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd synapse
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## Environment Variables

### Backend (.env file in `backend/` directory)

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/synapse
# Or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/synapse

# Email Configuration (for Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI Configuration (if using external APIs)
# OPENAI_API_KEY=your-openai-api-key
# Or configure Ollama endpoint
OLLAMA_BASE_URL=http://localhost:11434
```

### Frontend

The frontend may require environment variables if you need to configure API endpoints. Create a `.env.local` file in the `frontend/` directory if needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the frontend development server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

### Production Mode

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the frontend production server**
   ```bash
   npm start
   ```

3. **Start the backend production server**
   ```bash
   cd backend
   npm start
   ```

## Project Structure

```
synapse/
├── backend/
│   ├── src/
│   │   ├── agent/          # LangGraph agent implementation
│   │   ├── controllers/    # Route controllers
│   │   ├── helpers/        # Database and utility helpers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # Express routes
│   │   └── services/       # Business logic services
│   ├── uploads/            # Uploaded files storage
│   └── server.js           # Server entry point
├── frontend/
│   ├── app/                # Next.js app directory
│   ├── components/         # React components
│   └── public/             # Static assets
└── README.md
```

## API Endpoints

- `GET /` - Health check
- `POST /api/upload` - File upload endpoint
- `POST /api/agent/*` - AI agent endpoints
- `POST /api/email/*` - Email endpoints

## Pushing to GitHub

### Initial Setup

If this is your first time pushing to GitHub:

1. **Initialize Git repository** (if not already initialized)
   ```bash
   git init
   ```

2. **Add all files to staging**
   ```bash
   git add .
   ```

3. **Create your first commit**
   ```bash
   git commit -m "Initial commit: Synapse AI application"
   ```

4. **Create a new repository on GitHub**
   - Go to [GitHub](https://github.com) and create a new repository
   - Do NOT initialize it with a README, .gitignore, or license (if you already have these)

5. **Add the remote repository**
   ```bash
   git remote add origin https://github.com/your-username/your-repo-name.git
   ```
   Or if using SSH:
   ```bash
   git remote add origin git@github.com:your-username/your-repo-name.git
   ```

6. **Push to GitHub**
   ```bash
   git branch -M main
   git push -u origin main
   ```

### Subsequent Pushes

For future updates:

1. **Check status**
   ```bash
   git status
   ```

2. **Add changes**
   ```bash
   git add .
   ```
   Or add specific files:
   ```bash
   git add path/to/file
   ```

3. **Commit changes**
   ```bash
   git commit -m "Your descriptive commit message"
   ```

4. **Push to GitHub**
   ```bash
   git push
   ```
   Or if pushing a new branch:
   ```bash
   git push -u origin branch-name
   ```

### Important Notes

- **Never commit `.env` files** - They contain sensitive information and are already in `.gitignore`
- **Review changes before committing** - Use `git status` and `git diff` to see what will be committed
- **Write meaningful commit messages** - Describe what changes were made and why

## Troubleshooting

### Backend Issues

- **Port already in use**: Change the `PORT` in your `.env` file
- **MongoDB connection error**: Ensure MongoDB is running and `MONGO_URI` is correct
- **Module not found**: Run `npm install` in the `backend/` directory

### Frontend Issues

- **Build errors**: Check TypeScript errors with `npm run lint`
- **API connection errors**: Verify backend is running and `NEXT_PUBLIC_API_URL` is correct

## Contributing

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them
   ```bash
   git commit -m "Add: your feature description"
   ```

3. Push to your branch
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

## License

[Specify your license here]

## Support

For issues and questions, please open an issue on the GitHub repository.
