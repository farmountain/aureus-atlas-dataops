#!/bin/bash
# Reset demo environment to clean state

echo "🔄 Resetting demo environment..."

# Clear browser storage warning
echo ""
echo "⚠️  Manual steps required:"
echo "   1. Open browser DevTools (F12)"
echo "   2. Go to Application tab"
echo "   3. Clear all storage for localhost:5173"
echo "   4. Refresh page"
echo ""

# Clear evidence from demo runs (optional)
read -p "Clear demo evidence runs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf evidence/demo_runs/*
    echo "✓ Evidence cleared"
fi

# Rebuild application
npm run build --silent
echo "✓ Application rebuilt"

echo ""
echo "✅ Demo environment reset complete!"
echo "   Run: npm run dev"
