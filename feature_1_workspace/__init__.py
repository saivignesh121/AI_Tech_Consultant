"""Feature 1: Workspace and Multi-Tenant Management."""

# Routes will be imported once defined
try:
    from feature_1_workspace.routes import router
    __all__ = ["router"]
except ImportError:
    __all__ = []
