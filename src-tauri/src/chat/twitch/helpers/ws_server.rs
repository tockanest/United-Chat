use futures::{SinkExt, StreamExt};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

type Tx = tokio::sync::mpsc::UnboundedSender<Message>;
type Rx = tokio::sync::mpsc::UnboundedReceiver<Message>;

pub struct WebSocketServer {
    clients: Arc<Mutex<Vec<Tx>>>,
    client_addresses: Arc<Mutex<HashSet<String>>>,
}

impl WebSocketServer {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(Vec::new())),
            client_addresses: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub async fn run(&self, addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        println!("WebSocket server running on {}", addr);
        while let Ok((stream, addr)) = listener.accept().await {
            println!("Accepted connection from {}", addr);
            let addr_str = addr.to_string();
            let mut client_addresses = self.client_addresses.lock().await;
            if client_addresses.contains(&addr_str) {
                eprintln!("Client already connected: {}", addr_str);
                continue;
            }
            client_addresses.insert(addr_str.clone());

            let ws_stream = accept_async(stream).await?;
            let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
            self.clients.lock().await.push(tx);

            let clients = Arc::clone(&self.clients);
            let client_addresses = Arc::clone(&self.client_addresses);
            tokio::spawn(Self::handle_connection(
                ws_stream,
                rx,
                clients,
                client_addresses,
                addr_str,
            ));
        }
        Ok(())
    }

    async fn handle_connection(
        mut ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
        mut rx: Rx,
        clients: Arc<Mutex<Vec<Tx>>>,
        client_addresses: Arc<Mutex<HashSet<String>>>,
        addr_str: String,
    ) {
        loop {
            tokio::select! {
                Some(msg) = ws_stream.next() => {
                    if let Ok(msg) = msg {
                        if msg.is_close() {
                            break;
                        }
                    }
                }
                Some(msg) = rx.recv() => {
                    if let Err(e) = ws_stream.send(msg).await {
                        eprintln!("Error sending message: {}", e);
                        break;
                    }
                }
            }
        }

        let mut clients = clients.lock().await;
        clients.retain(|client| !client.is_closed());

        let mut client_addresses = client_addresses.lock().await;
        client_addresses.remove(&addr_str);
    }

    pub async fn broadcast(&self, msg: Message) {
        let clients = self.clients.lock().await;
        for client in clients.iter() {
            if let Err(e) = client.send(msg.clone()) {
                eprintln!("Error broadcasting message: {}", e);
            }
        }
    }
}
