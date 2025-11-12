const Contact = () => (
  <div className="p-6 max-w-md mx-auto">
    <h2 className="text-xl font-bold mb-4">Contact Us</h2>
    <form className="flex flex-col gap-4">
      <input type="text" placeholder="Name" className="border p-2 rounded" />
      <input type="email" placeholder="Email" className="border p-2 rounded" />
      <textarea placeholder="Message" className="border p-2 rounded" />
      <button className="bg-primary text-white px-4 py-2 rounded">Send</button>
    </form>
  </div>
);

export default Contact;
