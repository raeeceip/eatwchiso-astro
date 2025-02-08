import type { APIRoute } from "astro";

const menus = {
  breakfast: {
    "Pancakes": [
      {
        name: "Classic Buttermilk",
        price: "12.99",
        description: "Light and fluffy buttermilk pancakes served with maple syrup"
      },
      {
        name: "Chocolate Chip",
        price: "14.99",
        description: "Buttermilk pancakes loaded with chocolate chips"
      },
      {
        name: "Blueberry",
        price: "14.99",
        description: "Fresh blueberries folded into our signature batter"
      }
    ],
    "Sides": [
      {
        name: "Bacon",
        price: "4.99",
        description: "Crispy applewood smoked bacon"
      },
      {
        name: "Sausage",
        price: "4.99",
        description: "Premium pork breakfast sausage"
      },
      {
        name: "Ham",
        price: "4.99",
        description: "Thick-cut honey ham"
      }
    ]
  },
  lunch: {
    "Sandwiches": [
      {
        name: "Classic Club",
        price: "15.99",
        description: "Triple-decker with turkey, bacon, lettuce, and tomato"
      },
      {
        name: "Grilled Chicken",
        price: "14.99",
        description: "Marinated chicken breast with avocado and chipotle aioli"
      }
    ],
    "Salads": [
      {
        name: "Caesar",
        price: "12.99",
        description: "Romaine, parmesan, croutons, and house-made dressing"
      },
      {
        name: "Garden",
        price: "11.99",
        description: "Mixed greens, vegetables, and balsamic vinaigrette"
      }
    ]
  },
  dinner: {
    "Entrees": [
      {
        name: "Grilled Salmon",
        price: "24.99",
        description: "Fresh Atlantic salmon with lemon herb butter"
      },
      {
        name: "NY Strip Steak",
        price: "29.99",
        description: "12oz certified Angus beef with garlic herb butter"
      }
    ],
    "Sides": [
      {
        name: "Roasted Potatoes",
        price: "5.99",
        description: "Herb-seasoned baby potatoes"
      },
      {
        name: "Seasonal Vegetables",
        price: "5.99",
        description: "Chef's selection of fresh vegetables"
      }
    ]
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'breakfast';
    
    if (!menus[type as keyof typeof menus]) {
      return new Response(JSON.stringify({ error: 'Invalid menu type' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify(menus[type as keyof typeof menus]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
