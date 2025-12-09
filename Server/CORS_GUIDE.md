# CORS Configuration Guide

## Why CORS Errors Keep Happening

CORS (Cross-Origin Resource Sharing) errors occur when:
1. **Frontend and backend are on different origins** (different protocol, domain, or port)
2. **Preflight requests (OPTIONS) aren't handled properly** - browsers send these before actual requests
3. **Middleware order matters** - CORS must be applied BEFORE other middleware
4. **Socket.IO has separate CORS config** - it needs to match Express CORS
5. **Rate limiting blocks OPTIONS requests** - preflight requests get rate limited
6. **Helmet security headers conflict** - can block CORS headers

## What We Fixed

### 1. Centralized CORS Configuration
- Created `/Server/src/middlewares/cors.js` - single source of truth
- All CORS logic in one place, easier to maintain

### 2. Development Mode = Permissive
- In development, **all origins are allowed** - no more CORS errors during development
- Production still enforces strict origin checking

### 3. Proper Middleware Order
```javascript
// ✅ CORRECT ORDER:
app.use(corsMiddleware);  // FIRST - handles preflight
app.use(helmet());        // SECOND - configured to work with CORS
app.use(express.json());  // THIRD
// ... rest of middleware
```

### 4. Rate Limiter Skips OPTIONS
- Rate limiter now skips OPTIONS requests (preflight)
- Prevents blocking legitimate CORS preflight requests

### 5. Socket.IO CORS Matches Express
- Socket.IO CORS now matches Express CORS configuration
- Both allow all origins in development

## How to Debug CORS Issues

### Check Browser Console
Look for:
- `Access-Control-Allow-Origin` header missing
- `OPTIONS` request failing
- Origin not in allowed list

### Check Server Logs
The CORS middleware will log errors if origins are rejected (in production)

### Test with curl
```bash
# Test preflight request
curl -X OPTIONS http://localhost:5000/api/v1/auth/signin \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return CORS headers
```

## Common Issues & Solutions

### Issue: "No 'Access-Control-Allow-Origin' header"
**Solution:** CORS middleware not applied or in wrong order

### Issue: "Preflight request doesn't pass"
**Solution:** OPTIONS requests being blocked by rate limiter or other middleware

### Issue: "Credentials not allowed"
**Solution:** `credentials: true` must be set in CORS config

### Issue: Socket.IO connection fails
**Solution:** Socket.IO CORS must match Express CORS origins

## Environment Variables

Make sure these are set correctly:
```env
NODE_ENV=development  # Allows all origins in dev
FRONTEND_URL=http://localhost:3000  # Your frontend URL
```

## Testing

After making changes:
1. **Restart the server** - CORS config is loaded at startup
2. **Clear browser cache** - CORS preflight responses are cached
3. **Check Network tab** - Look for OPTIONS request and its response headers

## Production Checklist

Before deploying to production:
- [ ] Set `NODE_ENV=production`
- [ ] Update `FRONTEND_URL` to your production domain
- [ ] Add production domain to `allowedOrigins` in `cors.js`
- [ ] Test CORS with production URLs
- [ ] Verify Socket.IO CORS matches Express CORS

