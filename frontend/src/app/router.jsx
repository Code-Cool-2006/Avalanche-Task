import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Auth
import Login from '../features/auth/pages/Login';
import Signup from '../features/auth/pages/Signup';

// Movies
import Home from '../features/movies/pages/Home';
import MovieDetails from '../features/movies/pages/MovieDetails';

// Booking
import SeatSelection from '../features/booking/pages/SeatSelection';
import Payment from '../features/booking/pages/Payment';
import Confirmation from '../features/booking/pages/Confirmation';
import MyBookings from '../features/booking/pages/MyBookings';

// Admin
import AdminLayout from '../features/admin/pages/AdminLayout';
import Dashboard from '../features/admin/pages/Dashboard';
import ManageMovies from '../features/admin/pages/ManageMovies';
import ManageShows from '../features/admin/pages/ManageShows';
import ManageTheatres from '../features/admin/pages/ManageTheatres';
import AdminBookings from '../features/admin/pages/Bookings';
import Staff from '../features/admin/pages/Staff';
import ScanLogs from '../features/admin/pages/ScanLogs';

// Layout
import PageContainer from '../components/layout/PageContainer/PageContainer';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PageContainer><Home /></PageContainer>} />
        <Route path="/movie/:id" element={<PageContainer><MovieDetails /></PageContainer>} />
        <Route path="/login" element={<PageContainer><Login /></PageContainer>} />
        <Route path="/signup" element={<PageContainer><Signup /></PageContainer>} />

        {/* Protected Customer Routes */}
        <Route path="/show/:showId/seats" element={<SeatSelection />} />
        <Route path="/payment/:bookingId" element={<PageContainer><Payment /></PageContainer>} />
        <Route path="/booking/:bookingId" element={<PageContainer><Confirmation /></PageContainer>} />
        <Route path="/my-bookings" element={<PageContainer><MyBookings /></PageContainer>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="movies" element={<ManageMovies />} />
          <Route path="shows" element={<ManageShows />} />
          <Route path="theatres" element={<ManageTheatres />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="staff" element={<Staff />} />
          <Route path="scan-logs" element={<ScanLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
