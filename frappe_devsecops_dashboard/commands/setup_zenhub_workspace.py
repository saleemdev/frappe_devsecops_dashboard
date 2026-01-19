"""
Frappe CLI command to setup ZenHub workspace for a product

Usage:
    bench --site site_name setup-zenhub-workspace --product "Afyangu"
"""

import click
import frappe
from frappe.commands import get_site
from frappe_devsecops_dashboard.api.zenhub_workspace_setup import setup_product_workspace


@click.command("setup-zenhub-workspace")
@click.option("--product", required=True, help="Product name (e.g., 'Afyangu')")
def setup_zenhub_workspace(product):
    """
    Setup ZenHub workspace and projects for a product

    This command:
    1. Creates a ZenHub workspace named after the product
    2. Creates projects for each linked Frappe project
    3. Updates documents with ZenHub IDs
    """
    get_site()
    frappe.init(frappe.current.site)
    frappe.connect()

    try:
        click.secho(f"\n{'='*60}", fg="blue")
        click.secho(f"Setting up ZenHub workspace for product: {product}", fg="blue", bold=True)
        click.secho(f"{'='*60}\n", fg="blue")

        result = setup_product_workspace(product)

        if result["success"]:
            click.secho(f"\n✅ SUCCESS!\n", fg="green", bold=True)
            click.echo(f"Workspace ID:      {result['workspace_id']}")
            click.echo(f"Projects created:  {result['projects_created']}")

            if result['projects']:
                click.echo(f"\nProjects:")
                for proj in result['projects']:
                    click.echo(f"  • {proj['frappe_project']}")
                    click.echo(f"    └─ ZenHub ID: {proj['zenhub_project_id']}")

            click.secho(f"\nWorkspace is ready to use!", fg="green")
        else:
            click.secho(f"\n❌ FAILED!\n", fg="red", bold=True)
            click.echo(f"Error: {result['error']}")
            raise click.Abort()

    except Exception as e:
        click.secho(f"\n❌ ERROR: {str(e)}\n", fg="red", bold=True)
        raise click.Abort()
    finally:
        frappe.close()


if __name__ == "__main__":
    setup_zenhub_workspace()
