import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres({});

const initializeDatabase = async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          item TEXT NOT NULL
        );
      `;
      console.log("Database initialized successfully.");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error; 
    }
  };


const getTodos = async (request) => {
    try {
        const todos = await sql`SELECT id, item FROM todos`;
        return new Response(JSON.stringify(todos), { status: 200 });
      } catch (error) {
        console.error("Error fetching todos:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
        
};


const getTodoById = async (request, match) => {
    const id = match?.pathname?.groups?.id;

  if (!id) {
    return new Response("Bad Request: Missing or invalid 'id'", { status: 400 });
  }

  console.log("Received ID:", id);

  try {
    const todo = await sql`SELECT id FROM todos WHERE id = ${id}`;
    console.log("Fetched todo:", todo);

    if (todo.length === 0) {
        console.error("Todo not found for ID:", id);
      return new Response("Todo not found", { status: 404 });
    }

    const item = todo[0].item; 
    return new Response(item, { status: 200 });
  } catch (error) {
    console.error("Error fetching todo:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

  const addTodo = async (request) => {
    let todo;
    

    const contentType = request.headers.get("Content-Type");
  if (!contentType?.includes("application/json")) {
    return new Response("Bad Request: Unsupported or missing 'Content-Type'", { status: 400 });
  }


  try {
    const body = await request.text();
    console.log("Received JSON body:", body);
    todo = JSON.parse(body);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return new Response("Bad Request: Invalid JSON", { status: 400 });
  }


  if (!todo.item || typeof todo.item !== "string" || todo.item.trim() === "") {
    console.error("Validation failed: Missing or invalid 'item'", todo);
    return new Response("Bad Request: Missing or invalid 'item'", { status: 400 });
  }


  try {
    await sql`INSERT INTO todos (item) VALUES (${todo.item.trim()})`;
    return new Response("Todo added successfully", { status: 200 });
  } catch (error) {
    console.error("Error adding todo to database:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
  };
  


const urlMapping = [
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/todos" }),
    fn: getTodos,
  },
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/todos/:id" }),
    fn: (request, match) => getTodoById(request, match),
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/todos" }),
    fn: addTodo,
  },
];

const handleRequest = async (request) => {
    const mapping = urlMapping.find(
        (um) => um.method === request.method && um.pattern.test(request.url)
      );
    
      if (!mapping) {
        return new Response("Not Found", { status: 404 });
      }
    
      const match = mapping.pattern.exec(request.url);
      return mapping.fn(request, match);
};


const startServer = async () => {
  try {
    await initializeDatabase(); 
    console.log("Starting server on port 7777...");
    Deno.serve({ port: 7777 }, handleRequest);
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();