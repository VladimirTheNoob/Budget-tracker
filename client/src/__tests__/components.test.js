import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import App from '../App';
import LoginForm from '../components/LoginForm';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: initialState,
  });
};

// Test wrapper component for Redux and Router
const TestWrapper = ({ children, initialState = {} }) => {
  const store = createMockStore(initialState);
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

// Mock API calls
jest.mock('../api/auth', () => ({
  login: jest.fn(),
  logout: jest.fn(),
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  test('displays login button when user is not authenticated', () => {
    render(
      <TestWrapper initialState={{ auth: { isAuthenticated: false } }}>
        <App />
      </TestWrapper>
    );
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });
});

describe('LoginForm Component', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    mockLogin.mockClear();
  });

  test('renders login form with email and password inputs', () => {
    render(
      <TestWrapper>
        <LoginForm onLogin={mockLogin} />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('handles form submission with valid credentials', async () => {
    render(
      <TestWrapper>
        <LoginForm onLogin={mockLogin} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('displays validation errors for invalid inputs', async () => {
    render(
      <TestWrapper>
        <LoginForm onLogin={mockLogin} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
});

describe('Header Component', () => {
  test('renders logo and navigation links', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    expect(screen.getByText(/budget tracker/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  test('displays user menu when authenticated', () => {
    render(
      <TestWrapper initialState={{ auth: { isAuthenticated: true, user: { name: 'John Doe' } } }}>
        <Header />
      </TestWrapper>
    );

    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});

describe('ProtectedRoute Component', () => {
  test('redirects to login when user is not authenticated', () => {
    render(
      <TestWrapper initialState={{ auth: { isAuthenticated: false } }}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  test('renders protected content when user is authenticated', () => {
    render(
      <TestWrapper initialState={{ auth: { isAuthenticated: true } }}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
}); 